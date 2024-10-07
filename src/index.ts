import { randomUUID } from "node:crypto";
import express from "express";
import dotenv from "dotenv";

// Load .env's
dotenv.config();

// App imports
import { redisClient } from "./redis/connections";
import { checkHourFormat, checkHoursRange } from "./lib";
import { Wagons } from "./lib/wagons";
import { Personel } from "./lib/personel";
import { type DBCoaster, DBWagonDriveTime, DBWagon, coasterRepository, wagonRepository } from "./redis/shemas";
import { DrivePlan, WagonsData } from "./lib/drivetime";
import { WagonsDBOperations } from "./redis/utils";

process.on("uncaughtException", (err, origin) => {
    // TODO: Handle
    console.warn("Unhandled exception")
});

process.on("unhandledRejection", (reason) => {
    // TODO: Handle
    console.warn("Unhandled rejection")
})

// Express app
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/api/coasters", async (req, res) => {
    const jsonContent: RESTCoaster = req.body;

    const hoursCond = jsonContent.hours && (checkHourFormat(jsonContent.hours.from) && checkHourFormat(jsonContent.hours.to)) && checkHoursRange(jsonContent.hours);
    if (jsonContent.clients_count && jsonContent.personel_count && jsonContent.distance_meters && hoursCond) {
        // Coaster uuid v4
        const coasterUUID = randomUUID();

        // Save to database
        const { personel_count, clients_count, distance_meters, hours: { to: toHours, from: fromHours } } = jsonContent;
        
        const data: DBCoaster = {
            hours: [fromHours, toHours],
            personel_count: personel_count,
            clients_count: clients_count,
            distance_meters: distance_meters
        }
        await coasterRepository.save(`${coasterUUID}`, data);

        // Suggestions: Personel + Wagons
        // TODO: Repair broken suggestions
        const wagons = new Wagons(jsonContent.clients_count);
        const wagonsSuggestion = (wagons
            .payloadCalculateWagons()[0] as Wagons)
            .format("PL");
        const personel = new Personel(wagons.wagons!);
        const suggestionPersonelWagons = personel
            .wagonsCalculatePersonel()
            .wagonsFormat("PL");
        const suggestionPersonelCoaster = personel
            .boardingCoasterFormat("PL");

        // TODO: Spawn coaster from executable file by use of process node.js package

        // TODO: Client response
        res.status(202).json({
            suggestion: {
                wagons: wagonsSuggestion,
                wagons_personel: suggestionPersonelWagons,
                personel_coaster: suggestionPersonelCoaster
            }
        })
    }
    else res.sendStatus(406)
})

app.post("/api/coasters/:coasterId/wagons", async (req, res) => {
    const { seats, speed_m_per_s } = req.body as RESTWagon;
    const { coasterId } = req.params;

    const seatsCond = seats === 32 as WagonSeats || seats === 45 as WagonSeats || seats === 75 as WagonSeats;
    if (seatsCond && speed_m_per_s) {
        if (await redisClient.exists(`coaster:${coasterId}`)) {
            const newWagonId = randomUUID();

            // Save wagon to database
            const newWagon: RESTWagon = {
                seats,
                speed_m_per_s
            };
            await wagonRepository.save(`${coasterId}:${newWagonId}`, newWagon);

            // Generate drivetime
            const coaster = (await coasterRepository.fetch(`${coasterId}`)) as any as DBCoaster;
            // console.log(coaster.clients_count)

            // ... Get all wagons by key 'wagon:coaster_uuid:wagon_uuid'
            const wagonsDBOps = new WagonsDBOperations();
            const wagonsData = (await wagonsDBOps.getAllCoasterWagons(coasterId)).getWagonData();
            
            // ....... Add new to list too 
            wagonsData.push({
                ...newWagon,
                id: newWagonId
            })
            
            // ....... Calculate drive plan
            const drivePlanIns = new DrivePlan(coaster, wagonsData);
            const { driveTimes, handledClientsPotential } = drivePlanIns.computeDrivePlan();

            // Save Drivetimes to Database -> save as json
            for (const driveTimeEntity of driveTimes.entries()) {
                const [uniqueId, drivePlans] = driveTimeEntity;
                const drivePlansPrep = JSON.stringify(drivePlans);

                // Store object as json
                const save = await redisClient.RPUSH(`drive_times:${coasterId}:${uniqueId}`, drivePlansPrep);
            }

            // Publish Drivetime to coaster sub-program
            const topic = `${coasterId}-new-wagon`;
            const message = { wagon_id: newWagonId };
            redisClient.publish(topic, JSON.stringify(message));

            // Send response to client
            res.sendStatus(200);
        }
        else res.sendStatus(404)
    }
    else res.sendStatus(406)
})

app.delete("/api/coasters/:coasterId/wagons/:wagonId", async (req, res) => {
    const { coasterId, wagonId } = req.params;

    const clientsMulti = redisClient.multi();
    clientsMulti.exists(`coaster:${coasterId}`);
    clientsMulti.exists(`wagon:${coasterId}:${wagonId}`);
    const coasterAndWagonExists = (await clientsMulti.exec())
        .every(v => v ? true : false);

    if (coasterAndWagonExists) {
        // TODO: Recalculate coasters drive plan

        // TODO: Save coasters drive plan
        
        // TODO: Publish wagon was removes so plan must be recalculated

        // Delete coaster wagon
        const delMulti = redisClient.multi();
        delMulti.DEL(`drive_times:${coasterId}:${wagonId}`);
        delMulti.DEL(`wagon:${coasterId}:${wagonId}`);
        const delOp = await delMulti.exec();
        const deletedStatus = delOp.some(v => (v as number) > 0);

        deletedStatus
        ?
        res.sendStatus(200)
        :
        res.status(404)
            .json({ error_message: "Cannot delete wagon because already doesn't exists" })
    }
    else res.sendStatus(404)
})

app.listen(process.env.DEV_PORT);
