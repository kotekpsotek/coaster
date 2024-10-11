// 1. Check is wagon able handle to handle clients count in one day -> Done
// 2. When is not able handle clients in day give assumption how many wagons user should refill and from which type
// 3. Check has sufficient amount of personel to handle all wagons -> Done
// 4. Suggest how many personel is demanded for coaster -> Done
import { WagonsDBOperations } from "../redis/utils";
import { DrivePlan, WagonsData } from "./drivetime";
import { personelSingleWagon, personelCoasterBoarding, WagonsTypes, wagonTypes } from "../config";
import { coasterRepository, type DBCoaster } from "../redis/shemas";

type PercentageLoad = {
    wagonType: WagonSeats,
    percentage: number
}[]

interface SuggestionSignature {
    isDouble(): boolean | Promise<boolean>
    /** Produce the string message for implementor case */
    format<T extends FormatOptions, E extends FormatOptionalWagons>(variation: T, optional?: E): string | Promise<string>
}

export enum FormatOptions {
    ToSmall
}

export class PersonelSuggestions 
       extends WagonsDBOperations 
       implements SuggestionSignature
{
    actualCoasterPersonel: number;
    
    constructor(coasterPersonelCount: number) {
        super()
        this.actualCoasterPersonel = coasterPersonelCount;
    }
    
    /** Check personel is able to **handle wagons** */
    public canHandleWagons() {
        return this.actualCoasterPersonel >= this.getDemandedForWagons(this.wagons)
    }
    
    /** Check **personel** is able to **handle coaster** */
    public canPersonelHandleCoaster() {
        return this.canHandleWagons() && (this.actualCoasterPersonel >= (this.getDemandedForWagons(this.wagons) + 1))
    }

    /** 
     * Get how many **personel** is required to handle **all coaster wagons** 
     * @param wagons can take ids of wagons or wagons objects - count is worthy not what is inside
     * 
    */
    private getDemandedForWagons(wagons: any[]) {
        let requiredPersonelCount = 0;

        for (const _ of wagons) {
            requiredPersonelCount += personelSingleWagon; // one wagon requres same personel
        }

        return requiredPersonelCount;
    }

    /** Get how many **personel** is required to handle **coaster** and **wagons** */
    public getDemandedForCoasterAndWagons() {
        let wagons = 0;

        for (const _ of this.wagons) {
            wagons += personelSingleWagon; // For each wagon is demanded same amount of personel
        }

        return {
            personel: {
                wagons,
                coaster: wagons + personelCoasterBoarding
            }
        }
    }

    /** Check is double of personnel needed to handle our clients */
    public isDouble() {
        const wagonsCount = this.wagons.length;
        const thisWagonsRequiredPersonel = wagonsCount * personelSingleWagon + 1;
        
        return this.actualCoasterPersonel >= thisWagonsRequiredPersonel;
    }

    /** TODO: Format suggestion for Personel */
    public async format(personel: FormatOptions) {
        return ""
    }
}

type FormatOptionalWagons = {
    actualClients: number
    coasterPersonelCount: number
}

export class WagonsSuggestions 
    extends WagonsDBOperations 
    implements SuggestionSignature    
{
    handleClientsPotential: number;
    coasterId: string;
    wagons: any[];
    
    constructor(coasterId: string, wagons: any[], clientsHandlePotential: number) {
        super()
        this.handleClientsPotential = clientsHandlePotential;
        this.coasterId = coasterId;
        this.wagons = wagons;
    }

    /** Check wagons can handle clients */
    public canHandleClients(actualClients: number) {
        return this.handleClientsPotential >= actualClients;
    }

    public async getLackingToHandleClients(actualClients: number) {
        const coasterFc = (await coasterRepository.fetch(`${this.coasterId}`)) as any as DBCoaster;
        const lackingWagonsTypes: WagonsTypes = [];

        let clientsToHandle = actualClients - this.handleClientsPotential;

        if (clientsToHandle > 0) {
            const percentageLoadForEachWagonType: (passangers: number) => PercentageLoad = (passangers) => {
                return wagonTypes.map(v => ({ wagonType: v, percentage: 100 / v * passangers }));
            }
    
            const withBestPayload = (percentageLoad: PercentageLoad) => {
                return percentageLoad.reduce((p, v) => {
                    if (p.percentage > 100 && v.percentage > 100) {
                        if (p.percentage < v.percentage) {
                            return p
                        }
                        else return v;
                    }
                    else {
                        // (p.percentage <= 100 || v.percentage <= 100) 
                        if (p.percentage === 100 && v.percentage < 100) {
                            return p;
                        }
                        else if (v.percentage === 100 && p.percentage < 100) {
                            return v
                        }
                        else {
                            if (v.percentage > p.percentage) {
                                return v
                            }
                            else return p;
                        }
                    }
                });
            }

            while (clientsToHandle > 0) {
                // Download new wagons
                const wagonsDB = (await new WagonsDBOperations().getAllCoasterWagons(this.coasterId))
                    .getWagonData();
                
                // Choose the best wagon to actual load
                const percentageLoad = percentageLoadForEachWagonType(clientsToHandle);
                const bestAdjusted = withBestPayload(percentageLoad);
                console.log(bestAdjusted, percentageLoad)
                const thisWagon = {
                    speed_m_per_s: 10,
                    seats: bestAdjusted.wagonType
                } as WagonsData[0]


                const { handledClientsPotential } = new DrivePlan(coasterFc, [...wagonsDB, thisWagon])
                    .computeDrivePlan();

                lackingWagonsTypes.push(bestAdjusted.wagonType);
                clientsToHandle -= handledClientsPotential;
            }

            return lackingWagonsTypes;
        }
        else return lackingWagonsTypes;
    }

    /** Check is double of coasters we need to handle clients load */
    public async isDouble() {
        const coasterFc = (await coasterRepository.fetch(`${this.coasterId}`)) as any as DBCoaster;
        
        const wagons = (await new WagonsDBOperations().getAllCoasterWagons(this.coasterId))
            .getWagonData();
        const { handledClientsPotential } = new DrivePlan(coasterFc, wagons)
            .computeDrivePlan()

        return handledClientsPotential >= 2 * coasterFc.clients_count;
    }

    /** Format suggestion for Personel */
    public async format(personel: FormatOptions, option?: FormatOptionalWagons) {
        switch(personel) {
            case FormatOptions.ToSmall:
                if (!option) throw Error("\"option\" must be implemented for Format Wagons option");
                if (!option.actualClients || !option.coasterPersonelCount) throw Error("\"option have to implement required options\""); 
                
                const canHandleClients = this.canHandleClients(option.actualClients);
                const demandedCoasterPersonel = new PersonelSuggestions(option.actualClients).getDemandedForCoasterAndWagons().personel.coaster

                if (canHandleClients) {
                    return "You've enought wagons to handle clients load";
                }
                else return `You should have ${demandedCoasterPersonel} personel in coaster to handle coaster and its wagons`

            default:
                throw Error("Unhandled format possibility")
        }
    }
}