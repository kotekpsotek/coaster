export const supportedWagonTypes: WagonSeats[] = [32, 45, 75];

export type WagonsSet = { wagonType: WagonSeats, wagonsCount: number }[]
type PercentageLoad = {
    wagonType: WagonSeats,
    percentage: number
}[]

export class Wagons {
    clients: number
    
    constructor(clients: number) {
        this.clients = clients
    }
    
    // Trouble can be: hours range is to short to handle payload regard to wagon speed and safe treshold
    /**
     *  To calculate wagons for payload is required: clients count,
    */
   // Take the smallest amount of wagons with the heightest load
   // TODO: Calculations -> Rewrite to Rust by napi
    payloadCalculateWagons() {
        const wagonOutput: WagonsSet = [];
        
        // FIXME: Refactor
        const wagonsCount: WagonsSet = [
            {
                wagonType: 32,
                wagonsCount: this.clients / 32
            },
            {
                wagonType: 45,
                wagonsCount: this.clients / 45
            },
            {
                wagonType: 75,
                wagonsCount: this.clients / 75
            }
        ];

        const percentageLoadForEachWagonType: (passangers: number) => PercentageLoad = (passangers) => {
            return supportedWagonTypes.map(v => ({ wagonType: v, percentage: 100 / v * passangers }));
        }

        const withBestPayload = (percentageLoad: PercentageLoad) => {
            return percentageLoad.reduce((p, v) => {
                if (p.percentage <= 100) {
                    if (v.percentage <= 100) {
                        return v.percentage > p.percentage ? v : p;
                    }

                    return p;
                }
                else return v;
            });
        }

        // FIXME: Refactor
        if (this.clients <= (75 as WagonSeats)) {
            const firstPercentage = percentageLoadForEachWagonType(this.clients);
            const theBest = withBestPayload(firstPercentage);

            wagonOutput.push({
                wagonType: theBest.wagonType,
                wagonsCount: 1
            })
        }
        else {
            // Wagons from same type
            const theSmallestSameType = wagonsCount.reduce((p, c) => {
                if (p.wagonsCount < c.wagonsCount) {
                    return p;
                }

                return c
            });
            
            wagonOutput.push({
                ...theSmallestSameType,
                wagonsCount: Math.floor(theSmallestSameType.wagonsCount)
            });
            // Get 
            const onlyFloatingPointNum = (theSmallestSameType.wagonsCount - Math.floor(theSmallestSameType.wagonsCount));
    
            if (onlyFloatingPointNum != 0) {
                /* Focus on
                    - Favor less wagons amount and Adjust wagons size to payload
                */
                let remainsPassagersToHandle = Math.round(onlyFloatingPointNum * theSmallestSameType.wagonType);
    
                while(true) {
                    const fullFillmentInWagon = percentageLoadForEachWagonType(remainsPassagersToHandle);
                    const { wagonType } = withBestPayload(fullFillmentInWagon);
    
                    wagonOutput.push({
                        wagonType,
                        wagonsCount: 1
                    });
    
                    remainsPassagersToHandle -= wagonType
    
                    if (remainsPassagersToHandle <= 0) break;
                }
            }
        }

        return wagonOutput;
    }
}