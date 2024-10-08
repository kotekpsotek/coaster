import fs from "node:fs";
import _ from "lodash";

export const personelSingleWagon = 2;
export const personelCoasterBoarding = 1;

export interface AppConfig {
    mode: "production" | "developement",
    port: {
        production: number,
        developement: number
    },
    redisUrl: string
}

class Config {
    config: AppConfig;
    
    constructor(appConfig: AppConfig) {
        this.config = appConfig;
    }

    static appConfigLoad() {
        const file = fs.readFileSync("./app.config.json", "utf-8");
        const unjsonObject = JSON.parse(file) as AppConfig;

        // Check object correcteness
        const checkArray: (keyof AppConfig)[] = ["mode", "port", "redisUrl"];
        const baseCheck = Object.keys(unjsonObject)

        if (baseCheck.length !== checkArray.length || !_.isEqual(_.sortBy(baseCheck), _.sortBy(checkArray))) {
            throw Error("Cannot load config. Config syntax isn't correct")
        }
        
        return unjsonObject
    }

    setMode(mode: AppConfig["mode"]) {
        this.config.mode = mode;
    }

    getMode() {
        return this.config.mode;
    }
}

export const appConfig = new Config(Config.appConfigLoad());
Object.freeze(appConfig);

/* export function appConfigLoad() {
    const file = fs.readFileSync("./app.config.json", "utf-8");
    const unjsonObject = JSON.parse(file) as AppConfig;
    return unjsonObject
}

export const appConfig: AppConfig = {
    ...{} as any,
    mode: "production",
}; */
