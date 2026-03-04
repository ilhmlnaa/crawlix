import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

const traceExporter = new OTLPTraceExporter({});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "crawlix",
    [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || "1.0.0",
  }),
  traceExporter,
  instrumentations: [
    new HttpInstrumentation({
      ignoreIncomingRequestHook: (req) =>
        req.url === "/health" || req.url === "/metrics",
    }),
    new ExpressInstrumentation(),
  ],
});

sdk.start();

process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => console.log("OTel Tracing SDK shut down successfully"))
    .catch((error) =>
      console.error("Error shutting down OTel Tracing SDK", error),
    )
    .finally(() => process.exit(0));
});

export default sdk;
