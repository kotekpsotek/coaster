import { randomUUID } from "node:crypto";
import { it, describe, expect } from "vitest";
import { checkHourFormat, checkHoursRange } from "../src/lib"
// import { Wagons, WagonsSet } from "../src/lib/wagons"
// import { Personel } from "../src/lib/personel"
import { DrivePlan, WagonsData } from "../src/lib/drivetime";

describe("Test dependecies", () => {
    it("Check hour format", () => {
        const format1 = "12:34";
        const format2 = "14:60";
        const format3 = "24:00";
        const format4 = "00:00";

        const ch1 = checkHourFormat(format1);
        expect(ch1).toBe(true);

        const ch2 = checkHourFormat(format2);
        expect(ch2).toBe(false);

        const ch3 = checkHourFormat(format3);
        expect(ch3).toBe(false);

        const ch4 = checkHourFormat(format4);
        expect(ch4, format4 + " is not well handled").toBe(true);
    })

    it("Check hours range correcteness", () => {
        const f1: RESTCoaster["hours"] = {
            from: "12:30",
            to: "13:30"
        };
        const f2: RESTCoaster["hours"] = {
            to: "12:30",
            from: "13:30"
        };
        const f3: RESTCoaster["hours"] = {
            from: "12:30",
            to: "13:30"
        };
        const f3MinTimeMin = 45;
        const f4: RESTCoaster["hours"] = {
            from: "12:30",
            to: "13:00"
        };
        const f4MinTimeMin = 45;
        
        const ck1 = checkHoursRange(f1);
        expect(ck1).toBe(true);

        const ck2 = checkHoursRange(f2);
        expect(ck2).toBe(false);

        const ck3 = checkHoursRange(f3, f3MinTimeMin);
        expect(ck3).toBeTruthy()

        const ck4 = checkHoursRange(f4, f4MinTimeMin);
        expect(ck4).toBeFalsy()
    });
})

describe("Drive Plan", () => {
    const coaster = {
        clients_count: 70,
        distance_meters: 3800,
        hours: ["08:00", "14:00"] as [string, string]
    }
    
    it("Generate plan", () => {
        const wagons: WagonsData = [
            {
                id: randomUUID(),
                seats: 32,
                speed_m_per_s: 5.6
            },
            {
                id: randomUUID(),
                seats: 32,
                speed_m_per_s: 8000
            },
            {
                id: randomUUID(),
                seats: 32,
                speed_m_per_s: 15.5
            }, 
            {
                id: randomUUID(),
                seats: 75,
                speed_m_per_s: 15.5
            }
        ]
        const drivePlanIns = new DrivePlan(coaster, wagons);
        const c = drivePlanIns.computeDrivePlan();

        // console.log(c.driveTimes)
        
        expect(c.driveTimes.size).toBe(wagons.length)
    });

    it("Generate plan without wagon", () => {
        const firstWagonId = randomUUID();
        const wagons: WagonsData = [
            {
                id: firstWagonId,
                seats: 32,
                speed_m_per_s: 5.6
            },
            /* {
                id: randomUUID(),
                seats: 32,
                speed_m_per_s: 5.6
            },
            {
                id: randomUUID(),
                seats: 32,
                speed_m_per_s: 8000
            }, 
            {
                id: randomUUID(),
                seats: 32,
                speed_m_per_s: 15.5
            }, 
            {
                id: randomUUID(),
                seats: 75,
                speed_m_per_s: 15.5
            } */
        ]
        const drivePlanIns = new DrivePlan(coaster, wagons);
        const computed = drivePlanIns
            .withoutWagons(firstWagonId)
            .computeDrivePlan()
            .driveTimes;

        expect(computed.has(firstWagonId)).toBeFalsy();
    });

    it("Use \"withoutWagons\" method without ids", () => {
        const firstWagonId = randomUUID();
        const wagons: WagonsData = [
            {
                id: firstWagonId,
                seats: 32,
                speed_m_per_s: 5.6
            }
        ]
        const drivePlanIns = new DrivePlan(coaster, wagons);
        const computed = drivePlanIns
            .withoutWagons()
            .computeDrivePlan()
            .driveTimes;

        expect(computed.has(firstWagonId)).toBeTruthy();
    })
})
