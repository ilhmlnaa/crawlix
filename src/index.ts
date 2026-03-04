import "./instrumentation";

import express from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { config } from "./config";
import { swaggerSpec } from "./config/swagger";
import { scraperRouter } from "./routes/scraper.routes";
import { errorHandler } from "./middleware/error-handler";
import { requestLogger } from "./middleware/request-logger";
import { rateLimiter } from "./middleware/rate-limiter";
import { sanitizeInput } from "./middleware/sanitize";
import {
  preventParameterPollution,
  preventRequestSmuggling,
  validateContentType,
  preventCRLFInjection,
  requestSizeLimiter,
} from "./middleware/security";
import { logger } from "./utils/logger";
import { RedisClient } from "./services/redis.service";
import { BrowserPoolManager } from "./services/browser-pool.service";

const app = express();

app.set("trust proxy", config.trustProxy);

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(requestLogger);

/**
 * @swagger
 * /:
 *   get:
 *     summary: API Root
 *     description: Redirect to API documentation
 *     responses:
 *       302:
 *         description: Redirect to /api-docs
 */
app.get("/", (_req, res) => {
  res.redirect("/api-docs");
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Scraper Service API",
  }),
);

app.get("/api-docs.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     description: Quick health check endpoint (no rate limiting)
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 */
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use("/api", requestSizeLimiter(10 * 1024 * 1024));
app.use("/api", preventRequestSmuggling);
app.use("/api", preventCRLFInjection);
app.use("/api", validateContentType);
app.use("/api", preventParameterPollution);
app.use("/api", sanitizeInput);
app.use("/api", rateLimiter);

app.use("/api/scraper", scraperRouter);
app.use(errorHandler);

async function bootstrap() {
  try {
    await RedisClient.getInstance().connect();
    logger.info("Redis connected successfully");

    await BrowserPoolManager.getInstance().initialize();
    logger.info("Browser pool initialized");

    const server = app.listen(config.port, () => {
      logger.info(`Crawlix service running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(
        `Swagger docs available at: http://localhost:${config.port}/api-docs`,
      );
    });

    const shutdown = async () => {
      logger.info("Shutting down gracefully...");

      server.close(() => {
        logger.info("HTTP server closed");
      });

      await BrowserPoolManager.getInstance().destroy();
      await RedisClient.getInstance().disconnect();

      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap();
