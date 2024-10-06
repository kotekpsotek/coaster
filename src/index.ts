import express from "express";
import dotenv from "dotenv";

// Load .env's
dotenv.config();

// App imports
import { checkHourFormat, checkHoursRange } from "./lib";

// Express app
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/api/coasters", (req, res) => {
    const jsonContent: RESTCoaster = req.body;

    const hoursCond = (checkHourFormat(jsonContent.hours.from) && checkHourFormat(jsonContent.hours.to)) && checkHoursRange(jsonContent.hours);
    if (jsonContent.clients_count && jsonContent.personel_count && jsonContent.distance_meters && hoursCond) {
        
    }
    else res.sendStatus(406)

    res.sendStatus(200);
})

app.listen(process.env.DEV_PORT);
