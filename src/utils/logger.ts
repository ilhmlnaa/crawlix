import winston from "winston";
import { OpenTelemetryTransportV3 } from "@opentelemetry/winston-transport";
import { config } from "../config";

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  }),
);

export const logger = winston.createLogger({
  level: config.env === "development" ? "debug" : "info",
  format: logFormat,
  defaultMeta: { service: "crawlix" },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // Sends logs to SigNoz via OpenTelemetry (active when OTEL_ENABLED=true)
    ...(process.env.OTEL_ENABLED === "true"
      ? [new OpenTelemetryTransportV3()]
      : []),
  ],
});

if (config.env === "production") {
  logger.add(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
  );
  logger.add(
    new winston.transports.File({
      filename: "logs/combined.log",
    }),
  );
}
