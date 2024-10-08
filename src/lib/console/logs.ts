// File contains logger
// Modifies behaviour  "console" functions: log, info, warn
import winston from "winston";
import { appConfig } from "../../config";

function log() {
  const log = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'error.log', dirname: `logs/${appConfig.getMode()}`, level: 'error' }),
        new winston.transports.File({ filename: 'warn.log', dirname: `logs/${appConfig.getMode()}`, level: "warn" }),
        new winston.transports.File({ filename: 'info.log', dirname: `logs/${appConfig.getMode()}`, level: "info" }),
      ]
  });

  return log;
}

const oLog = console.log;
const oWarn = console.warn;
const oError = console.error;

function customLog(message: string) {
  if (appConfig.getMode() === "developement") {
    oLog(message);
    log().info(message)
  }
}

function customWarn(message: string) {
  oWarn(message);
  log().warn(message)
}

function customError(message: string) {
  oError(message);
  log().error(message)
}

// Override console.log
console.log = customLog;
console.warn = customWarn;
console.error = customError;
