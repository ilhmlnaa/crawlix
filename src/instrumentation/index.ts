import dotenv from "dotenv";
dotenv.config();

if (process.env.OTEL_ENABLED === "true") {
  require("./logging-instrumentation");
  require("./tracing-instrumentation");
}
