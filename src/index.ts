console.log("Launching...")

import { appConfig } from "./config";
import { randomUUID } from "node:crypto";
import express from "express";
import dotenv from "dotenv";
import "./lib/console/logs"

// Load .env's
dotenv.config();

// App imports
import { redisClient } from "./redis/connections";
import { checkHourFormat, checkHoursRange } from "./lib";
// import { Wagons } from "./lib/wagons";
// import { Personel } from "./lib/personel";
import { type DBCoaster, DBWagonDriveTime, DBWagon, coasterRepository, wagonRepository } from "./redis/shemas";
import { DrivePlan, WagonsData } from "./lib/drivetime";
import { drivetimeWagonReSave, WagonsDBOperations } from "./redis/utils";
import consoleStatistics from "./lib/statistics/console";
import { CollectStatsDataDB } from "./lib/statistics/collect";
import { Suggestions } from "./lib/suggestions";

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
        const suggestions = new Suggestions(`${coasterUUID}`, [], 0, personel_count);
        const lackWagons = await suggestions
            .getLackingWagonsToHandleClients(clients_count);
        const countSameWagons = lackWagons.reduce((acc, element) => {
            (acc as any)[`${element}`] = ((acc as any)[`${element}`] || 0) + 1;
            return acc;
            }, {});
        suggestions.wagons = lackWagons;

        // TODO: Spawn coaster from executable file by use of process node.js package

        // Display statistics
        const stat = await (new CollectStatsDataDB()
            .collectData())
        consoleStatistics(stat);
        
        // TODO: Client response
        res.status(202).json({
            suggestion: {
                wagons: `Add count wagons with such seats  to handle your cliens load: ${JSON.stringify(countSameWagons)}`,
                personel_coaster: suggestions.canPersonelHandleCoaster() ? `You've enought personel to handle coaster` : `You should have ${suggestions.getPerosonelDemandedForCoasterAndWagons().personel.coaster} personel in coaster to handle coaster and its wagons`
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
            const coasterFc = (await coasterRepository.fetch(`${coasterId}`)) as any as DBCoaster;
            const coaster = {
                personel_count: coasterFc.personel_count,
                clients_count: coasterFc.clients_count,
                distance_meters: coasterFc.distance_meters,
                hours: coasterFc.hours
            }

            // ... Get all wagons by key 'wagon:coaster_uuid:wagon_uuid'
            const wagonsDBOps = new WagonsDBOperations();
            const wagonsData = (await wagonsDBOps.getAllCoasterWagons(coasterId)).getWagonData();
            
            // ....... Calculate drive plan
            const drivePlanIns = new DrivePlan(coaster, wagonsData);
            const { driveTimes, handledClientsPotential } = drivePlanIns.computeDrivePlan();

            // Save Drivetimes for each wagon to Database -> save as json
            await drivetimeWagonReSave(coasterId, driveTimes);

            // Publish Drivetime to coaster sub-program
            const topic = `${coasterId}-new-wagon`;
            const message = { wagon_id: newWagonId };
            redisClient.publish(topic, JSON.stringify(message));

            // Hinters
            const suggestion = new Suggestions(coasterId, wagonsData, handledClientsPotential, coasterFc.personel_count);
            // ..... Wagon to small
            const wagonToSmall = suggestion.canWagonsHandleClients(coasterFc.clients_count) ? "You've enought wagons to handle clients load" : `You should have ${suggestion.getPerosonelDemandedForCoasterAndWagons().personel.coaster} personel in coaster to handle coaster and its wagons`;
            // ..... Personel to small
            const personel = suggestion.canPersonelHandleCoaster() ? `You've enought personel to handle coaster` : `You should have ${suggestion.getPerosonelDemandedForCoasterAndWagons().personel.coaster} personel in coaster to handle coaster and its wagons`

            // Display statistics
            const stat = await (new CollectStatsDataDB()
                .collectData())
            consoleStatistics(stat);

            // Send response to client
            res.status(202).json({
                suggestion: {
                    wagons: await suggestion.isDoubleWagonsToHandleClients() ? "You have double or more of wagons required to handle your cliens load" : wagonToSmall,
                    personel_coaster: suggestion.isDoubleOfNeededPersonel() ?  `You should have ${suggestion.getPerosonelDemandedForCoasterAndWagons().personel.coaster} personel in coaster to handle your clients efficiently` : personel
                }
            })
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
        // Recalculate coasters drive plan without this one removed wagon
        // ... Coaster
        const coasterDB = (await coasterRepository.fetch(`${coasterId}`)) as any as DBCoaster;
        // ... Wagons
        const wagonsDBOp = new WagonsDBOperations();
        const wagonsDB = (await wagonsDBOp.getAllCoasterWagons(coasterId)).getWagonData();
        // ... Drive Plan
        const drivePlanIns = new DrivePlan(coasterDB, wagonsDB);
        const { driveTimes, handledClientsPotential } = drivePlanIns
            .withoutWagons(wagonId)
            .computeDrivePlan();

        // Save coasters drive plan
        await drivetimeWagonReSave(coasterId, driveTimes);
        
        // Publish wagon was removes so plan must be recalculated
        const topic = `${coasterId}-deleted-wagon`;
        const message = { wagon_id: wagonId };
        redisClient.publish(topic, JSON.stringify(message));

        // Delete coaster wagon
        const delMulti = redisClient.multi();
        delMulti.DEL(`drive_times:${coasterId}:${wagonId}`);
        delMulti.DEL(`wagon:${coasterId}:${wagonId}`);
        const delOp = await delMulti.exec();
        // ... 
        const deletedStatus = delOp.some(v => (v as number) > 0);

        // Display statistics
        const stat = await (new CollectStatsDataDB()
            .collectData())
        consoleStatistics(stat);

        // Hinters
        const suggestion = new Suggestions(coasterId, wagonsDB, handledClientsPotential, coasterDB.personel_count);
        // ..... Wagon to small
        const wagonToSmall = suggestion.canWagonsHandleClients(coasterDB.clients_count) ? "You've enought wagons to handle clients load" : `You should have ${suggestion.getPerosonelDemandedForCoasterAndWagons().personel.coaster} personel in coaster to handle coaster and its wagons`;
        // ..... Personel to small
        const personel = suggestion.canPersonelHandleCoaster() ? `You've enought personel to handle coaster` : `You should have ${suggestion.getPerosonelDemandedForCoasterAndWagons().personel.coaster} personel in coaster to handle coaster and its wagons`
        
        // Send hinters
        res.status(202).json({
            suggestion: {
                wagons: await suggestion.isDoubleWagonsToHandleClients() ? "You have double or more of wagons required to handle your cliens load" : wagonToSmall,
                personel_coaster: suggestion.isDoubleOfNeededPersonel() ?  `You should have ${suggestion.getPerosonelDemandedForCoasterAndWagons().personel.coaster} personel in coaster to handle your clients efficiently` : personel
            }
        })
    }
    else res.sendStatus(404)
})

type CoasterUpdateOp = Pick<RESTCoaster, "personel_count" | "clients_count" | "hours">;
app.put("/api/coasters/:coasterId", async (req, res) => {
    const { coasterId } = req.params;
    const data = req.body as CoasterUpdateOp;

    if (data.hours || data.personel_count || data.clients_count) {
        if (await redisClient.EXISTS(`coaster:${coasterId}`)) {
            // Update coaster information from database
            // ... Coasters
            const dataCoaster = (await coasterRepository.fetch(`${coasterId}`)) as DBCoaster;
            // ... Wagons
            const wagonsDBOp = new WagonsDBOperations();
            const wagonsDB = (await wagonsDBOp.getAllCoasterWagons(coasterId)).getWagonData();

            dataCoaster.hours = data.hours ? [data.hours.from, data.hours.to] : dataCoaster.hours;
            dataCoaster.personel_count = data.personel_count ? data.personel_count : dataCoaster.personel_count;
            dataCoaster.clients_count = data.clients_count ? data.clients_count : dataCoaster.clients_count;

            const saved = await coasterRepository.save(dataCoaster);

            // Update driveplan for whole coaster
            const drivePlanIns = new DrivePlan(dataCoaster, wagonsDB);
            // ... Get driveplans
            const { driveTimes } = drivePlanIns
                .computeDrivePlan();
                
            // ... Resave wagons driveplans with the freshest data 
            await drivetimeWagonReSave(coasterId, driveTimes)

            // Check clients count is sufficient
            const suggestion = new Suggestions(coasterId, wagonsDB, drivePlanIns.handledClientsPotential, dataCoaster.personel_count);
            // ..... Wagon to small
            const wagonToSmall = suggestion.canWagonsHandleClients(dataCoaster.clients_count) ? "You've enought wagons to handle clients load" : `You should have ${suggestion.getPerosonelDemandedForCoasterAndWagons().personel.coaster} personel in coaster to handle coaster and its wagons`;
            // ..... Personel to small
            const personel = suggestion.canPersonelHandleCoaster() ? `You've enought personel to handle coaster` : `You should have ${suggestion.getPerosonelDemandedForCoasterAndWagons().personel.coaster} personel in coaster to handle coaster and its wagons`;

            // Warn is user has double of wagons
            if (await suggestion.isDoubleWagonsToHandleClients()) console.warn("Double of wagons required to handle clients for coaster id: " + coasterId);

            // Publish coaster update using Redis PUB/SUB
            const topic = `${coasterId}-updated`;
            redisClient.publish(topic, "");

            // Display Statistics
            const stat = await (new CollectStatsDataDB()
                .collectData())
            consoleStatistics(stat);

            // Give response
            res.status(202).json({
                suggestion: {
                    wagons: await suggestion.isDoubleWagonsToHandleClients() ? "You have double or more of wagons required to handle your cliens load" : wagonToSmall,
                    personel_coaster: suggestion.isDoubleOfNeededPersonel() ?  `You should have ${suggestion.getPerosonelDemandedForCoasterAndWagons().personel.coaster} personel in coaster to handle your clients efficiently` : personel
                }
            })
        }
        else res.sendStatus(404);
    }
    else res.sendStatus(406);
})

app.listen(appConfig.config.port[appConfig.config.mode]);
console.log("Launched!!");
