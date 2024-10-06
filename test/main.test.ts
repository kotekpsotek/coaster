import { it, describe, expect } from "vitest";
import { checkHourFormat, checkHoursRange } from "../src/lib"

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
    })
})
