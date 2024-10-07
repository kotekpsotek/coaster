import { randomUUID } from "node:crypto";
import { it, describe, expect } from "vitest";
import { checkHourFormat, checkHoursRange } from "../src/lib"
import { Wagons, WagonsSet } from "../src/lib/wagons"
import { Personel } from "../src/lib/personel"
import { DrivePlan } from "../src/lib/drivetime";

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

// TODO: Improve granuality of tests
describe("Suggestions", () => {
    it("Wagons suggestion: Number to handle clients efficiently", () => {
        // Small Number
        const w2 = new Wagons(55);
        const c2 = (w2.payloadCalculateWagons())[1] as WagonsSet;
        
        expect(c2).toBeTypeOf("object");
        expect(c2.length).toBe(1);
        expect(c2[0].wagonType).toBe(75);
        expect(c2[0].wagonsCount).toBe(1);
        
        // Basic Number
        const w1 = new Wagons(175);
        const c1 = w1.payloadCalculateWagons()[1] as WagonsSet;

        expect(c1).toBeTypeOf("object");
        expect(c1[0].wagonType).toBe(75);
        expect(c1[0].wagonsCount).toBe(2);

        expect(c1).toBeTypeOf("object");
        expect(c1[1].wagonType).toBe(32);
        expect(c1[1].wagonsCount).toBe(1);

        // Format wagons
            // PL
        const f1 = w1.format("PL");
        expect(f1.length).toBeGreaterThan(5);
        console.log(f1)
            // EN
        const f2 = w1.format("EN");
        expect(f2.length).toBeGreaterThan(5);
        console.log(f2)
    })

    it("Personel suggestions", () => {
        // Initialize what is required
        const wagons = new Wagons(20000);
        const personel = new Personel(wagons.payloadCalculateWagons()[1] as WagonsSet);
        
        // Wagons
        const personelWagons = personel
            .wagonsCalculatePersonel()
            .personelPerWagons;
        expect(personelWagons).toBeTypeOf("object");
        // expect(personel.wagonsTypesSet.length).toBe(1) // FIXME: uncomment
        expect(personel.wagonsTypesSet[0].wagonType).toBe(75 as WagonSeats)


            // Polish language test
        const formattedWagonsPL = personel.wagonsFormat("PL");
        expect(formattedWagonsPL).toBeTypeOf("string");
        expect(formattedWagonsPL.length).toBeGreaterThanOrEqual(10)

            // English language test
        const formattedWagonsEN = personel.wagonsFormat("EN");
        expect(formattedWagonsEN).toBeTypeOf("string");
        expect(formattedWagonsEN.length).toBeGreaterThanOrEqual(10)
        console.log(formattedWagonsEN)

        // Coaster itself
            // English
        const boardingCoasterTeamEN = personel.boardingCoasterFormat("EN");
        expect(boardingCoasterTeamEN.length).toBeGreaterThanOrEqual(5);
            // Polish
        const boardingCoasterTeamPL = personel.boardingCoasterFormat("PL");
        expect(boardingCoasterTeamPL.length).toBeGreaterThanOrEqual(5);
        console.log(boardingCoasterTeamEN)
    })
})

describe("Drive Plan", () => {
    it("#1", () => {
        const drivePlanIns = new DrivePlan({
            clients_count: 70,
            distance_meters: 3800,
            hours: ["08:00", "14:40"]
        }, 
        [{
            id: randomUUID(),
            seats: 32,
            speed_m_per_s: 5.6
        }])
        drivePlanIns.computeDrivePlan()
    });
})
