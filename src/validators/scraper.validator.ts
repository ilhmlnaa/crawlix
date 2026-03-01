import Joi from "joi";

export const scraperOptionsSchema = Joi.object({
  strategy: Joi.string()
    .valid("cloudscraper", "playwright", "auto")
    .default("auto")
    .description("Scraping strategy to use"),

  useProxy: Joi.boolean().default(false).description("Whether to use proxy"),
  proxyUrl: Joi.string().uri().allow(null, "").description("Custom proxy URL"),

  timeout: Joi.number()
    .integer()
    .min(1000)
    .max(120000)
    .default(30000)
    .description("Request timeout in milliseconds"),

  waitUntil: Joi.string()
    .valid("load", "domcontentloaded", "networkidle", "commit")
    .default("domcontentloaded")
    .description("Wait until event (Playwright only)"),

  waitForSelector: Joi.string()
    .max(500)
    .allow(null, "")
    .description("CSS selector to wait for (Playwright only)"),

  waitForFunction: Joi.string()
    .max(1000)
    .allow(null, "")
    .description("JavaScript function to wait for (Playwright only)"),

  additionalDelay: Joi.number()
    .integer()
    .min(0)
    .max(30000)
    .default(0)
    .description("Additional delay after page load (ms)"),

  method: Joi.string()
    .valid("GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS")
    .default("GET")
    .description("HTTP method"),

  body: Joi.alternatives()
    .try(Joi.string(), Joi.object())
    .description("Request body"),

  formData: Joi.object()
    .pattern(Joi.string(), Joi.any())
    .description("Form data"),

  headers: Joi.object()
    .pattern(Joi.string(), Joi.string())
    .max(20)
    .description("Custom HTTP headers"),

  useCache: Joi.boolean().default(true).description("Whether to use cache"),

  cacheTTL: Joi.number()
    .integer()
    .min(60)
    .max(86400 * 7)
    .description("Cache TTL in seconds"),

  cacheKey: Joi.string()
    .max(200)
    .pattern(/^[a-zA-Z0-9:_-]+$/)
    .allow(null, "")
    .description("Custom cache key"),

  maxRetries: Joi.number()
    .integer()
    .min(0)
    .max(10)
    .default(3)
    .description("Maximum retry attempts"),

  retryDelay: Joi.number()
    .integer()
    .min(100)
    .max(10000)
    .default(1000)
    .description("Initial retry delay in milliseconds"),
});

export const fetchRequestSchema = Joi.object({
  url: Joi.string()
    .pattern(/^https?:\/\/.+/)
    .required()
    .max(2048)
    .description("URL to scrape"),

  options: scraperOptionsSchema.optional(),
}).required();

export const batchFetchRequestSchema = Joi.object({
  urls: Joi.array()
    .items(
      Joi.string()
        .pattern(/^https?:\/\/.+/)
        .max(2048),
    )
    .min(1)
    .max(10)
    .required()
    .description("Array of URLs to scrape (max 10)"),

  options: scraperOptionsSchema.optional(),
}).required();

export const cacheClearQuerySchema = Joi.object({
  pattern: Joi.string()
    .max(200)
    .pattern(/^[a-zA-Z0-9:*_-]+$/)
    .default("*")
    .description("Cache key pattern to clear"),
});

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: errors,
      });
    }

    req.body = value;
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: errors,
      });
    }

    Object.assign(req.query, value);
    next();
  };
};
