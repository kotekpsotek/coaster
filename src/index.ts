import { randomUUID } from "node:crypto";
import express from "express";
import dotenv from "dotenv";

// Load .env's
dotenv.config();

// App imports
import { checkHourFormat, checkHoursRange } from "./lib";
import { Wagons } from "./lib/wagons";
import { Personel } from "./lib/personel";
import { type DBCoaster, coasterRepository, wagonRepository } from "./redis/shemas";
import { redisClient } from "./redis/connections";

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
            const wagonId = randomUUID();

            // Save wagon to database
            await wagonRepository.save(`${wagonId}`, {
                seats,
                speed_m_per_s
            })

            // TODO: Generate drivetime
            const coaster = (await coasterRepository.fetch(`${coasterId}`)) as any as DBCoaster;
            console.log(coaster.clients_count)

            // TODO: Save Drivetimes to Database

            // TODO: Publish Drivetime to coaster

            // TODO: Send response to client
        }
        else res.sendStatus(404)
    }
    else res.sendStatus(406)
})

app.listen(process.env.DEV_PORT);
