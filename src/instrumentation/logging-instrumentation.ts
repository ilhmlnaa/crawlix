import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";

const logExporter = new OTLPLogExporter({});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "crawlix",
  }),
  logRecordProcessor: new BatchLogRecordProcessor(logExporter),
  instrumentations: [new WinstonInstrumentation()],
});

sdk.start();

process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => console.log("OpenTelemetry SDK shut down successfully"))
    .catch((error) => console.error("Error shutting down OTel SDK", error))
    .finally(() => process.exit(0));
});

export default sdk;
