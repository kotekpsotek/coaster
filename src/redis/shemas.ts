import { Repository, Schema } from "redis-om"
import { redisClient } from "./connections";
import { WagonDrivePlan } from "../lib/drivetime";

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

export interface DBWagons extends RESTWagon {};
const wagonSchema = new Schema("wagon", {
    seats: { type: 'number' },
    speed_m_per_s: { type: 'number' }
}, {
    dataStructure: "HASH"
});
export const wagonRepository = new Repository(wagonSchema, redisClient);

export interface DBWagonDriveTime extends WagonDrivePlan {}
