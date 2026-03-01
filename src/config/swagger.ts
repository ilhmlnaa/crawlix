import swaggerJsdoc from "swagger-jsdoc";
import path from "path";
import { config } from "./index";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Crawlix API",
    version: "1.0.0",
    description: `
Web scraping service with support for multiple strategies (Cloudscraper and Playwright).

## Features
- Multiple scraping strategies (Cloudscraper, Playwright, Auto)
- Redis-based caching with configurable TTL
- Automatic retry with exponential backoff
- Browser pooling for efficient resource management
- Proxy support
- Rate limiting
- Health checks and statistics

## Authentication
Currently no authentication required. Implement rate limiting via client IP.

## Rate Limits
- ${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs / 1000} seconds per IP
    `,
    contact: {
      name: "API Support",
      email: "sena@hamdiv.me",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}`,
      description: "Development server",
    },
    {
      url: config.productionUrl,
      description: "Production server",
    },
  ],
  tags: [
    {
      name: "Scraper",
      description: "Web scraping operations",
    },
    {
      name: "Cache",
      description: "Cache management",
    },
    {
      name: "System",
      description: "System information and health checks",
    },
  ],
  components: {
    schemas: {
      ScraperOptions: {
        type: "object",
        properties: {
          strategy: {
            type: "string",
            enum: ["cloudscraper", "playwright", "auto"],
            default: "auto",
            description:
              "Scraping strategy: cloudscraper (fast), playwright (powerful), auto (fallback)",
          },
          useProxy: {
            type: "boolean",
            default: false,
            description: "Enable proxy usage",
          },
          proxyUrl: {
            type: "string",
            format: "uri",
            nullable: true,
            description: "Custom proxy URL (overrides default)",
          },
          timeout: {
            type: "integer",
            minimum: 1000,
            maximum: 120000,
            default: 30000,
            description: "Request timeout in milliseconds",
          },
          waitUntil: {
            type: "string",
            enum: ["load", "domcontentloaded", "networkidle", "commit"],
            default: "domcontentloaded",
            description: "Wait until event (Playwright only)",
          },
          waitForSelector: {
            type: "string",
            nullable: true,
            description: "CSS selector to wait for (Playwright only)",
            example: ".content",
          },
          waitForFunction: {
            type: "string",
            nullable: true,
            description: "JavaScript function to wait for (Playwright only)",
            example: '() => document.readyState === "complete"',
          },
          additionalDelay: {
            type: "integer",
            minimum: 0,
            maximum: 30000,
            default: 0,
            description: "Additional delay after page load (ms)",
          },
          method: {
            type: "string",
            enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
            default: "GET",
            description: "HTTP method",
          },
          body: {
            oneOf: [{ type: "string" }, { type: "object" }],
            description: "Request body",
          },
          formData: {
            type: "object",
            additionalProperties: true,
            description: "Form data",
          },
          headers: {
            type: "object",
            additionalProperties: {
              type: "string",
            },
            description: "Custom HTTP headers",
            example: {
              "User-Agent": "Custom User Agent",
              "Accept-Language": "en-US",
            },
          },
          useCache: {
            type: "boolean",
            default: true,
            description: "Enable caching",
          },
          cacheTTL: {
            type: "integer",
            minimum: 60,
            maximum: 604800,
            description: "Cache time-to-live in seconds",
          },
          cacheKey: {
            type: "string",
            nullable: true,
            pattern: "^[a-zA-Z0-9:_-]+$",
            description: "Custom cache key",
          },
          maxRetries: {
            type: "integer",
            minimum: 0,
            maximum: 10,
            default: 3,
            description: "Maximum retry attempts",
          },
          retryDelay: {
            type: "integer",
            minimum: 100,
            maximum: 10000,
            default: 1000,
            description: "Initial retry delay (ms)",
          },
        },
      },
      ScraperResult: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "Whether the scraping was successful",
          },
          content: {
            type: "string",
            description: "Scraped content",
          },
          type: {
            type: "string",
            description: "Content type (e.g., text/html, application/json)",
          },
          method: {
            type: "string",
            description: "Scraping method used",
            example: "cloudscraper-direct",
          },
          responseTime: {
            type: "integer",
            description: "Response time in milliseconds",
          },
          cached: {
            type: "boolean",
            description: "Whether result was from cache",
          },
          retries: {
            type: "integer",
            description: "Number of retry attempts made",
          },
          error: {
            type: "string",
            nullable: true,
            description: "Error message if failed",
          },
        },
      },
      Error: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          error: {
            type: "string",
            description: "Error message",
          },
          details: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: {
                  type: "string",
                },
                message: {
                  type: "string",
                },
              },
            },
          },
        },
      },
    },
    responses: {
      ValidationError: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/Error",
            },
          },
        },
      },
      RateLimitError: {
        description: "Rate limit exceeded",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: {
                  type: "boolean",
                  example: false,
                },
                error: {
                  type: "string",
                  example: "Too many requests, please try again later",
                },
              },
            },
          },
        },
      },
    },
  },
};

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: [
    path.join(__dirname, "../routes/*.{ts,js}"),
    path.join(__dirname, "../index.{ts,js}"),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
