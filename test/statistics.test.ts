import { describe, expect, it } from "vitest";
import consoleStatistics, { type ConsoleStatisticsCoaster } from "../src/lib/statistics/console";

describe("Statistics", () => {
    it("Display statistics", () => {
        const statData: ConsoleStatisticsCoaster[] = [{
            coaster_id: "Hello 1",
            avaiableCoasters: 2,
            avaiableWagons: 1,
            avaiablePersonel: 2,
            clientsLoad: 4
        }]
        const stat = consoleStatistics(statData);

        expect(stat).toHaveLength(1);
        expect(stat[0]).toHaveProperty("coaster_id")
    })
});