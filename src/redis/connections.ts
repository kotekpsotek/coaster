import { appConfig } from "../config";
import { createClient } from "redis";

export const redisClient = createClient({
    url: appConfig.config.redisUrl
});

(async () => {
    await redisClient.connect();
})()
