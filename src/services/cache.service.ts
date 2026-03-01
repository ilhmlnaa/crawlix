import crypto from "crypto";
import { config } from "../config";
import { logger } from "../utils/logger";
import { RedisClient } from "./redis.service";
import { CacheEntry, ScraperResult } from "../types";

export class CacheService {
  private static instance: CacheService;
  private redis: RedisClient;

  private constructor() {
    this.redis = RedisClient.getInstance();
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  generateCacheKey(url: string, strategy?: string, customKey?: string): string {
    if (customKey) {
      return `cache:${customKey}`;
    }

    const keyData = `${url}:${strategy || "auto"}`;
    const hash = crypto
      .createHash("sha256")
      .update(keyData)
      .digest("hex")
      .substring(0, 16);
    return `cache:${hash}`;
  }

  async get(cacheKey: string): Promise<ScraperResult | null> {
    if (!config.cache.enabled) {
      return null;
    }

    try {
      const cached = await this.redis.get<CacheEntry>(cacheKey);

      if (!cached) {
        logger.debug(`Cache MISS: ${cacheKey}`);
        return null;
      }

      logger.debug(`Cache HIT: ${cacheKey}`);

      return {
        success: true,
        content: cached.content,
        type: cached.type,
        method: cached.method,
        responseTime: cached.responseTime,
        fromCache: true,
        cached: true,
      };
    } catch (error) {
      logger.error("Cache GET error:", error);
      return null;
    }
  }

  async set(
    cacheKey: string,
    result: ScraperResult,
    ttl?: number,
  ): Promise<boolean> {
    if (!config.cache.enabled || !result.success) {
      return false;
    }

    try {
      const cacheEntry: CacheEntry = {
        content: result.content,
        type: result.type,
        method: result.method,
        responseTime: result.responseTime,
        timestamp: Date.now(),
      };

      const cacheTTL = ttl || config.cache.defaultTTL;
      await this.redis.set(cacheKey, cacheEntry, cacheTTL);

      logger.debug(`Cache SET: ${cacheKey} (TTL: ${cacheTTL}s)`);
      return true;
    } catch (error) {
      logger.error("Cache SET error:", error);
      return false;
    }
  }

  async delete(cacheKey: string): Promise<boolean> {
    try {
      await this.redis.delete(cacheKey);
      logger.debug(`Cache DELETE: ${cacheKey}`);
      return true;
    } catch (error) {
      logger.error("Cache DELETE error:", error);
      return false;
    }
  }

  async clear(pattern: string = "*"): Promise<number> {
    try {
      
      const fullPattern = `cache:${pattern}`;
      const client = this.redis.getClient();
      const keys = await client.keys(fullPattern);
      
      if (keys.length > 0) {
        await client.del(...keys);
      }
      
      logger.info(
        `Cleared ${keys.length} cache entries matching pattern: ${pattern}`,
      );
      return keys.length;
    } catch (error) {
      logger.error("Cache CLEAR error:", error);
      return 0;
    }
  }

  async exists(cacheKey: string): Promise<boolean> {
    try {
      return await this.redis.exists(cacheKey);
    } catch (error) {
      logger.error("Cache EXISTS error:", error);
      return false;
    }
  }
  
  async healthCheck(): Promise<boolean> {
    try {
        const testKey = 'health:check';
        await this.redis.set(testKey, 'ok', 10);
        const val = await this.redis.get(testKey);
        return val === 'ok';
    } catch (error) {
        logger.error("Cache Health Check Failed:", error);
        return false;
    }
  }
}
