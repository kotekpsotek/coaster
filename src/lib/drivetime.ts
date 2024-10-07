import { DBCoaster, DBWagons } from "../redis/shemas";

type CoasterData = Pick<DBCoaster, "clients_count" | "distance_meters" | "hours">;
type WagonData = (DBWagons & { id: string })[];

interface WagonDrivePlan {
    startTime: string
    endTime: string
    readyForNextRoundTime: string
}

/**
 * Calculate drivetimes for coaster with specific wagon calculation
*/
export class DrivePlan {
    wagons: WagonData = [];
    coaster: CoasterData
    handledClients: number = 0;
    
    constructor(coaster: CoasterData, wagons: WagonData) {
        this.coaster = coaster;
        this.wagons = wagons;
    }

    /** Compute drive plan for whole coaster */
    computeDrivePlan() {
        const distance = this.coaster.distance_meters;
        const [fromHour, toHour] = this.coaster.hours;

        /** How will work:
         * TODO: Size of picked up should be adjusted to workload
            1. Iterate over wagons:
                1. First wagon goes wirts in the day starting by "fromHour",
                2. Take distance in meters and speed in meters per second obtain end time of route for this wagon
                3. Increase handled clients count
                4. Add 5 minutes to wait before start
                5. Add to storage titled with id of storage like map: end time, start time and ready for nex route time 
                6. Next wagons start 3 minutes after prior
                7. Same calculate end time + 5 minutes
                8. When some train overpasses hour is not attached to set and loop ends
        */
        const makeForwardHour = (since: string, timeMins: number) => {
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
       
       const driveTimes: Map<WagonData[0]["id"], WagonDrivePlan> = new Map();
        while (true) {
            for (const wagon of this.wagons) {
                if (!driveTimes.size) {
                    const timeToPassTrackMin = distance / wagon.speed_m_per_s / 60;
                    const endTime = makeForwardHour(fromHour, timeToPassTrackMin);
                    
                    const obj: WagonDrivePlan = {
                        startTime: fromHour,
                        endTime,
                        readyForNextRoundTime: makeForwardHour(endTime, 5)
                    }

                    driveTimes.set(wagon.id, obj);

                    console.log(driveTimes)
                    break
                } 
                else {
                    break
                }
            }

            break
        }
    }
    // TODO: is able to handle clients
}