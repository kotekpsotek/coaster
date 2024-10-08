import fs from "node:fs";

export const personelSingleWagon = 2;
export const personelCoasterBoarding = 1;

interface AppConfig {
    mode: "production" | "developement",
    port: {
        production: number,
        developement: number
    },
    redisUrl: string
}

function appConfigLoad() {
    const file = fs.readFileSync("./app.config.json", "utf-8");
    const unjsonObject = JSON.parse(file) as AppConfig;
    return unjsonObject
}

export const appConfig: AppConfig = appConfigLoad();
