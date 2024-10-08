import { appConfig } from "../src/config";
import { describe, expect, it } from "vitest";
import "../src/lib/console/logs";

// beforeEach(() => {
//     // Clear the module cache
//     appConfig.setMode("developement")
// });


describe("Test logs", () => {
    describe("[developement] behaviour", () => {        
        it("console.log - developement", () => {
            appConfig.setMode("developement")
            console.log("[developement mode] test - console.log")
        });

        it("console.warn - developement", () => {
            appConfig.setMode("developement")
            console.warn("[developement mode] test - console.warn")
        });

        it("console.error - developement", () => {
            appConfig.setMode("developement")
            console.error("[developement mode] test - console.error")
        });
    });

    describe("[production] behaviour", () => {
        it("console.log - production", () => {
            appConfig.setMode("production")
            console.log("[production mode] test - console.log")
        });

        it("console.warn - production", () => {
            appConfig.setMode("production")
            console.warn("[production mode] test - console.warn")
        });

        it("console.error - production", () => {
            appConfig.setMode("production")
            console.error("[production mode] test - console.error")
        });
    })
})
