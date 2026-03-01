import { config } from "../config";
import { logger } from "../utils/logger";
import { ScraperOptions, ScraperResult } from "../types";
import { CloudscraperService } from "./cloudscraper.service";
import { PlaywrightService } from "./playwright.service";
import { CacheService } from "./cache.service";
import { IScraperStrategy } from "../interfaces/scraper-strategy.interface";

export class ScraperService {
  private static instance: ScraperService;
  private strategies: Map<string, IScraperStrategy>;
  private cacheService: CacheService;

  private constructor() {
    this.strategies = new Map();
    this.strategies.set("cloudscraper", CloudscraperService.getInstance());
    this.strategies.set("playwright", PlaywrightService.getInstance());
    this.cacheService = CacheService.getInstance();
  }

  public static getInstance(): ScraperService {
    if (!ScraperService.instance) {
      ScraperService.instance = new ScraperService();
    }
    return ScraperService.instance;
  }

  async fetch(
    url: string,
    options: ScraperOptions = {},
  ): Promise<ScraperResult> {
    const {
      strategy = config.scraper.defaultStrategy,
      useCache = config.cache.enabled,
      cacheKey: customCacheKey,
      maxRetries = config.scraper.maxRetries,
    } = options;

    const cacheKey = this.cacheService.generateCacheKey(
      url,
      strategy,
      customCacheKey,
    );

    if (useCache) {
      const cachedResult = await this.cacheService.get(cacheKey);
      if (cachedResult) {
        logger.info(`[Cache HIT] ${url}`);
        return cachedResult;
      }
      logger.debug(`[Cache MISS] ${url}`);
    }

    let retries = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let result: ScraperResult;

        if (strategy === "auto") {
          result = await this.fetchAuto(url, options);
        } else {
          const scraper = this.strategies.get(strategy);
          if (!scraper) {
            throw new Error(`Strategy ${strategy} not found`);
          }
          result = await scraper.fetch(url, options);
        }

        if (result.success) {
          if (useCache) {
            await this.cacheService.set(cacheKey, result, options.cacheTTL);
          }
          return {
            ...result,
            retries: attempt,
          };
        }

        throw new Error(result.error || "Scraping failed");
      } catch (error: any) {
        retries = attempt;
        logger.warn(
          `[Scraper] Attempt ${attempt + 1}/${maxRetries + 1} failed: ${error.message}`,
        );

        if (attempt === maxRetries) {
          return {
            success: false,
            content: "",
            type: "",
            method: strategy,
            responseTime: 0,
            error: error.message,
            retries,
          };
        }

        const delay = (options.retryDelay || 1000) * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      content: "",
      type: "",
      method: strategy,
      responseTime: 0,
      error: "Max retries exceeded",
      retries,
    };
  }

  private async fetchAuto(
    url: string,
    options: ScraperOptions,
  ): Promise<ScraperResult> {
    const cloudscraper = this.strategies.get("cloudscraper")!;
    const result = await cloudscraper.fetch(url, options);

    if (result.success) {
      return result;
    }

    logger.warn(`[Auto] Cloudscraper failed, trying Playwright for: ${url}`);

    const playwright = this.strategies.get("playwright")!;
    return playwright.fetch(url, options);
  }

  public async clearCache(pattern: string): Promise<number> {
    return this.cacheService.clear(pattern);
  }

  public async healthCheck(): Promise<any> {
    const redisHealth = await this.cacheService.healthCheck();
    const { BrowserPoolManager } = await import("./browser-pool.service");
    const browserPoolHealth = BrowserPoolManager.getInstance().getStats();

    return {
      status: redisHealth ? "ok" : "degraded",
      services: {
        redis: redisHealth,
        browserPool: browserPoolHealth,
      },
    };
  }
}
