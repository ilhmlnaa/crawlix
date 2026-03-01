import Redis from "ioredis";
import { config } from "../config";
import { logger } from "../utils/logger";

export class RedisClient {
  private static instance: RedisClient;
  private client: Redis | null = null;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    try {
      this.client = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        keyPrefix: config.redis.keyPrefix,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      this.client.on("connect", () => {
        this.isConnected = true;
        logger.info("Redis client connected");
      });

      this.client.on("error", (err) => {
        logger.error("Redis client error:", err);
      });

      this.client.on("close", () => {
        this.isConnected = false;
        logger.warn("Redis client disconnected");
      });

      await this.client.ping();
    } catch (error) {
      logger.error("Failed to connect to Redis:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      logger.info("Redis client disconnected");
    }
  }

  getClient(): Redis {
    if (!this.client || !this.isConnected) {
      throw new Error("Redis client is not connected");
    }
    return this.client;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis DELETE error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  async flushPattern(pattern: string): Promise<number> {
    if (!this.isConnected || !this.client) {
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        return await this.client.del(...keys);
      }
      return 0;
    } catch (error) {
      logger.error(`Redis FLUSH error for pattern ${pattern}:`, error);
      return 0;
    }
  }
}
