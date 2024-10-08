import { MapDrivePlan, WagonsData } from "../lib/drivetime";
import { redisClient } from "./connections";
import { DBWagon, wagonRepository } from "./shemas";

export type WagonID = string;
export type WagonOutcome = [DBWagon, WagonID];
/** Interaction with Database Wagons */
export class WagonsDBOperations {
    wagons: WagonOutcome[] = []
    
    constructor() {}
    
    /** 
        * Fetch all wagons of specified coaster id from redis database
    */
    async getAllCoasterWagons(coasterId: string): Promise<this> {
        // Reset wagons state for each call
        this.wagons = [];
        
        // Fetch wagons data
        const allWagonsKeys = await redisClient.KEYS(`wagon:${coasterId}:*`);
        for (const key of allWagonsKeys) {
            const wagonId = key.split(":")[2];
            const wagonDBRaw = (await wagonRepository.fetch(`${coasterId}:${wagonId}`)) as DBWagon;
            const wagonDB = {
                seats: wagonDBRaw.seats,
                speed_m_per_s: wagonDBRaw.speed_m_per_s
            } as DBWagon
            this.wagons.push([wagonDB, wagonId])
        }

        return this;
    }

    /**
        * Transforms database Wagons to list of wagons containing as id property wagon database id
    */
    getWagonData(): WagonsData {
        const data: WagonsData = [];

        for (const wagon of this.wagons) {
            const [wagonItself, wagonId] = wagon;
            data.push({
                ...wagonItself,
                id: wagonId
            })
        }
        
        return data;
    }
}

export async function drivetimeWagonReSave(coasterId: string, driveTimes: MapDrivePlan) {
    for (const driveTimeEntity of driveTimes.entries()) {
        const [uniqueId, drivePlans] = driveTimeEntity;
        const drivePlansPrep = JSON.stringify(drivePlans);

        // Store object as json
        const save = await redisClient.SET(`drive_times:${coasterId}:${uniqueId}`, drivePlansPrep);
    }
}
