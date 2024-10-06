import { Repository, Schema } from "redis-om"
import { redisClient } from "./connections";

type FromHour = string;
type ToHour = string;
export interface DBCoaster extends Omit<RESTCoaster, "hours"> {
    hours: [FromHour, ToHour]
}

const coasterSchema = new Schema("coaster", {
    personel_count: { type: 'number' },
    clients_count: { type: 'number' },
    distance_meters: { type: 'number' },
    hours: { type: 'string[]' }
}, {
    dataStructure: "HASH"
});
export const coasterRepository = new Repository(coasterSchema, redisClient)
