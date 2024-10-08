import { appConfig } from "../config";
import { createClient } from "redis";

export const redisClient = createClient({
    url: appConfig.redisUrl
});

(async () => {
    await redisClient.connect();
})()
