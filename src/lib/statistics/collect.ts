import { redisClient } from "../../redis/connections";
import { coasterRepository, DBCoaster } from "../../redis/shemas";
import { ConsoleStatisticsCoaster } from "./console";

/** Download from DB all data for statistics */
export class CollectStatsDataDB {
    private coastersKeys: string[] = []
    private coasters: Partial<ConsoleStatisticsCoaster>[] = []
    
    constructor() {}

    /** Download keys of all avaiable coatsers indentifiers from database */
    private async getCoasters() {
        const coatsersList = await redisClient.KEYS("coaster:*");
        this.coastersKeys = coatsersList;

        return this;
    }

    public async collectData() {
        const coasters1 = await this.getCoasters();
        const coasters2 = await coasters1.getCoasterData();
        const coasters3 = await coasters1.getCoasterWagonsCount();
        const coasters4 = await coasters3.collect();

        return coasters4;
    }

    /** Download data from: coaster:coaster_uuid coaster repository through **Redis OM** */
    private async getCoasterData() {
        for (const coasterKey of this.coastersKeys) {
            const [_, id] = coasterKey.split(":");

            const coaster = await coasterRepository.fetch(id) as DBCoaster;

            const coasterObj: Partial<ConsoleStatisticsCoaster> = {
                coaster_id: id,
                avaiablePersonel: coaster.personel_count,
                clientsLoad: coaster.clients_count,
            };
            this.coasters.push(coasterObj);

            return this;
        }
    }

    /** Assign to already existsing this.coasters each object wagons count by fetching in redis using pattern wagon:coaster_uuid:wagon_uuid */
    private async getCoasterWagonsCount() {
        for (let i = 0; i < this.coasters.length; i++) {
            const coaster = this.coasters[i];
            const { coaster_id } = coaster;

            const numberForCoaster = await redisClient.KEYS(`wagon:${coaster_id}:*`);
            coaster.avaiableWagons = numberForCoaster.length >= 0 ? numberForCoaster.length : 0;
        }

        return this;
    }

    private async collect(): Promise<ConsoleStatisticsCoaster[]> {
        // Check correcteness -> all keys must be within object
        for (const { coaster_id, clientsLoad, avaiableWagons, avaiablePersonel } of this.coasters) {
            if (!coaster_id || !clientsLoad || !avaiableWagons || !avaiablePersonel) {
                console.error("Collection Error -> Cannot return coaster statistics data from DB, because one of coasters hasn't required key")
            }
        }

        return this.coasters as ConsoleStatisticsCoaster[];
    }
}