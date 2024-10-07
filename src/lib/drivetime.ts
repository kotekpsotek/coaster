import { DBCoaster, DBWagons } from "../redis/shemas";

type CoasterData = Pick<DBCoaster, "clients_count" | "distance_meters" | "hours">;
type WagonData = (DBWagons & { id: string })[];

interface WagonDrivePlan {
    startTime: string
    endTime: string
    readyForNextRoundTime: string
}

function makeMinutesFromTime(time: string) {
    const [hour, min] = time.split(":");
    const [hr, mn] = [Number(hour), Number(min)];

    return hr * 60 + mn;
}

/**
 * Modified map to serve Drive Plan purposes
*/
class MapDrivePlan extends Map<WagonData[0]["id"], WagonDrivePlan[]> {
    /**
     * @param id 
     * @param drivePlan 
     * @param coasterEndTime 
     * @returns {boolean} - save status. true - saved, false - not saved
     * @description Set driveplan only when finishes before coaster close time. Return save status
     */
    setConditional(id: WagonData[0]["id"], drivePlan: WagonDrivePlan, coasterEndTime: string): boolean {
        const coasterEndTimeMins = makeMinutesFromTime(coasterEndTime);
        const driveplanEndTimeMins = makeMinutesFromTime(drivePlan.endTime);
        
        if (driveplanEndTimeMins < coasterEndTimeMins) {
            const actual = super.get(id);
            super.set(id, (actual ? [...actual, drivePlan] : [drivePlan]));

            return true;
        }
        else return false;
    }

    /**
     * @param id 
     * @returns {undefined | WagonDrivePlan[]}
     * @description Get value but also allow access to last element from driveplan list
     */
    getChain(id: string) {
        const currentValue = super.get(id);

        return {
            currentValue,
            last: () => {
                return currentValue 
                ? 
                currentValue[currentValue.length - 1] 
                : 
                undefined;
            } 
        }        
    }
}

/**
 * Calculate drivetimes for coaster with specific wagon calculation
*/
export class DrivePlan {
    wagons: WagonData = [];
    coaster: CoasterData
    /** Represents in day potential to handle clients */
    handledClientsPotential: number = 0;
    
    constructor(coaster: CoasterData, wagons: WagonData) {
        this.coaster = coaster;
        this.wagons = wagons;
    }

    /** Compute drive plan for whole coaster */
    /** How will work:
     * TODO: When train overpass time coaster end seek faster train
     * TODO: Size of picked up should be adjusted to workload
     * TODO: Adjust train to load -> the bigest should go as first
        1. Iterate over wagons:
            1. First wagon goes wirts in the day starting by "fromHour",
            2. Take distance in meters and speed in meters per second obtain end time of route for this wagon
            3. Increase handled clients count
            4. Add 5 minutes to wait before start
            5. Add to storage titled with id of storage like map: end time, start time and ready for nex route time 
            6. Next wagons start 3 minutes after prior
            7. Same calculate end time + 5 minutes
            8. When some train overpasses hour is not attached to set and loop ends
        2. Return Results: driveplan, how many clients coaster can handle in specific time
    */
    computeDrivePlan() {
        const distance = this.coaster.distance_meters;
        const [fromHour, toHour] = this.coaster.hours;

        const makeForwardHour = (since: string, timeMins: number) => {
            if (since && timeMins) {
                const [sHour, sMin] = since.split(":"); 
                const sMins = Number(sHour) * 60 + Number(sMin);
    
                const add = sMins + timeMins;
    
                const hrs = Math.floor(add / 60);
                const mins = Math.floor(add % 60);
    
                const format = (unit: number) => {
                    if (unit < 10) {
                        return `0${unit}`;
                    }
                    else return `${unit}`
                }
    
                return `${format(hrs)}:${format(mins)}`
            }
            else return ""
        }
       
        const driveTimes = new MapDrivePlan();
        const loopArrayIds = [...this.wagons].map(v => v.id);
        const finishedStates: string[] = [];
        
        // Calculate how manu clients coaster can handle
        let lastId: string = '';
        while(true) {
            for (const wagonId of loopArrayIds) {
                if (!finishedStates.includes(wagonId)) {
                    // For next others
                    const wagon = this.wagons.find(v => v.id === wagonId)!;
                    const timeToPassTrackMin = distance / wagon.speed_m_per_s / 60;
                    
                    const tresholdMin = 3;
                    
                    const startTime = !driveTimes.size ? fromHour : makeForwardHour((driveTimes.has(wagonId) ? driveTimes.getChain(wagonId).last()!.readyForNextRoundTime : driveTimes.getChain(lastId).last()!.startTime), tresholdMin);
                    const endTime = makeForwardHour(!driveTimes.size ? fromHour : startTime, timeToPassTrackMin)
                    
                    const obj: WagonDrivePlan = {
                        startTime,
                        endTime,
                        readyForNextRoundTime: makeForwardHour(endTime, 5)
                    }

                    // Check driveTime instance was saved in array
                    // Do conditional stuff for cases: was/wasn't
                    const saveStatus = driveTimes.setConditional(wagon.id, obj, toHour);
                    if (!saveStatus) {
                        finishedStates.push(wagonId)
                    } else {
                        const wagonSeats = this.wagons.find(v => v.id === wagonId)?.seats;

                        if (wagonSeats) {
                            this.handledClientsPotential += wagonSeats;
                        }
                    }

                    lastId = wagonId;
                }
            };

            // Brake iteration -> when each id has assigned routes filling day to close time, cannot complete next
            if (finishedStates.length === loopArrayIds.length) break;
        };

        return {
            driveTimes,
            handledClientsPotential: this.handledClientsPotential
        };
    }
}