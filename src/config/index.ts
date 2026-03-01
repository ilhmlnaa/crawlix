import dotenv from "dotenv";

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3001", 10),

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || "0", 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || "scraper:",
  },

  cache: {
    defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || "3600", 10),
    enabled: process.env.CACHE_ENABLED !== "false",
  },

  scraper: {
    defaultStrategy: (process.env.SCRAPER_DEFAULT_STRATEGY ||
      "cloudscraper") as "cloudscraper" | "playwright",
    defaultTimeout: parseInt(
      process.env.SCRAPER_DEFAULT_TIMEOUT || "30000",
      10,
    ),
    maxRetries: parseInt(process.env.SCRAPER_MAX_RETRIES || "3", 10),
    proxyUrl: process.env.SCRAPER_PROXY_URL,
    useProxy: process.env.SCRAPER_USE_PROXY === "true",
    maxBatchSize: parseInt(process.env.SCRAPER_MAX_BATCH_SIZE || "5", 10),
  },

  playwright: {
    headless: process.env.PLAYWRIGHT_HEADLESS !== "false",
    maxBrowsers: parseInt(process.env.PLAYWRIGHT_MAX_BROWSERS || "2", 10),
    browserIdleTimeout: parseInt(
      process.env.PLAYWRIGHT_IDLE_TIMEOUT || "300000",
      10,
    ),
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
    bypassKey: process.env.RATE_LIMIT_BYPASS_KEY,
  },

  trustProxy: parseInt(process.env.TRUST_PROXY || "1", 10),

  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
      : "*",
  },

  productionUrl: process.env.PRODUCTION_URL || "https://scraper.hamdiv.me",
};
