import { describe, expect, it } from "vitest";
import consoleStatistics, { type ConsoleStatisticsCoaster } from "../src/lib/statistics/console";
import { CollectStatsDataDB } from "../src/lib/statistics/collect";
import _ from "lodash";

describe("Statistics", () => {
    it("Display statistics", () => {
        const statData: ConsoleStatisticsCoaster[] = [{
            coaster_id: "Hello 1",
            avaiableWagons: 1,
            avaiablePersonel: 2,
            clientsLoad: 4
        }]
        const stat = consoleStatistics(statData);

        expect(stat).toHaveLength(1);
        expect(stat[0]).toHaveProperty("coaster_id")
    });

    it("Download statistics from database", async () => {
        const collectData = await new CollectStatsDataDB()
            .collectData();
        
        if (collectData.length) {
            const c = collectData[0];
            const checkArray = ["coaster_id", "avaiablePersonel", "clientsLoad", "avaiableWagons"];
            expect(_.isEqual(_.sortBy(Object.keys(c)), _.sortBy(checkArray)))
        }
    })
});