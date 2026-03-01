import { Request, Response } from "express";
import { ScraperService } from "../services/scraper.service";
import { BrowserPoolManager } from "../services/browser-pool.service";
import { logger } from "../utils/logger";
import { config } from "../config";

export class ScraperController {
  private static scraperService = ScraperService.getInstance();
  private static browserPoolManager = BrowserPoolManager.getInstance();

  public static async fetch(req: Request, res: Response) {
    const { url, options = {} } = req.body;

    logger.info(`[Request] Scraping: ${url}`, {
      strategy: options.strategy || "auto",
      useProxy: options.useProxy || false,
      useCache: options.useCache !== false,
    });

    const result = await ScraperController.scraperService.fetch(url, options);

    res.json({
      success: result.success,
      data: {
        content: result.content,
        type: result.type,
        method: result.method,
        responseTime: result.responseTime,
        cached: result.cached || false,
        retries: result.retries || 0,
      },
      error: result.error,
    });
  }

  public static async batchFetch(req: Request, res: Response) {
    const { urls, options = {} } = req.body;

    if (urls.length > config.scraper.maxBatchSize) {
      logger.warn(
        `[Batch Request] Rejected: Batch size ${urls.length} exceeds limit ${config.scraper.maxBatchSize}`,
      );
      res.status(400).json({
        success: false,
        error: {
          message: `Batch size exceeds limit of ${config.scraper.maxBatchSize}`,
          code: "BATCH_SIZE_EXCEEDED",
        },
      });
    }

    logger.info(`[Batch Request] Scraping ${urls.length} URLs`);

    const results = await Promise.all(
      urls.map((url: string) =>
        ScraperController.scraperService.fetch(url, options),
      ),
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.length - successful;

    res.json({
      success: true,
      data: {
        total: results.length,
        successful,
        failed,
        results: results.map((r) => ({
          success: r.success,
          content: r.content,
          type: r.type,
          method: r.method,
          responseTime: r.responseTime,
          cached: r.cached || false,
          error: r.error,
        })),
      },
    });
  }

  public static async clearCache(req: Request, res: Response) {
    const { pattern = "*" } = req.query;

    logger.info(`[Cache Clear] Pattern: ${pattern}`);

    const count = await ScraperController.scraperService.clearCache(
      pattern as string,
    );

    res.json({
      success: true,
      data: {
        cleared: count,
        pattern,
      },
    });
  }

  public static async getStats(_req: Request, res: Response) {
    const browserPool = ScraperController.browserPoolManager.getStats();

    res.json({
      success: true,
      data: {
        browserPool,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
    });
  }

  public static async getHealth(_req: Request, res: Response) {
    const health = await ScraperController.scraperService.healthCheck();

    res.json({
      success: true,
      data: health,
    });
  }
}
