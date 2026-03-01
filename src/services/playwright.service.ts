import { BrowserContext, Page } from "playwright";
import { config } from "../config";
import { logger } from "../utils/logger";
import { BrowserPoolManager } from "./browser-pool.service";
import { ScraperResult, ScraperOptions } from "../types";
import { IScraperStrategy } from "../interfaces/scraper-strategy.interface";

export class PlaywrightService implements IScraperStrategy {
  private static instance: PlaywrightService;
  private browserPool: BrowserPoolManager;

  private constructor() {
    this.browserPool = BrowserPoolManager.getInstance();
  }

  public static getInstance(): PlaywrightService {
    if (!PlaywrightService.instance) {
      PlaywrightService.instance = new PlaywrightService();
    }
    return PlaywrightService.instance;
  }

  async fetch(
    url: string,
    options: ScraperOptions = {},
  ): Promise<ScraperResult> {
    const startTime = Date.now();
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    const {
      useProxy = false,
      timeout = config.scraper.defaultTimeout,
      waitUntil = "domcontentloaded",
      waitForSelector,
      waitForFunction,
      additionalDelay = 0,
      method = "GET",
      body,
      formData,
      headers,
    } = options;

    try {
      logger.debug(
        `[Playwright] Fetching: ${url} (proxy: ${useProxy}, method: ${method})`,
      );

      const browser = await this.browserPool.getBrowser(useProxy);

      context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        ignoreHTTPSErrors: true,
      });

      page = await context.newPage();
      page.setDefaultTimeout(timeout);

      let content: string;
      let contentType: string;

      if (method.toUpperCase() === "GET") {
        const response = await page.goto(url, {
          waitUntil: waitUntil as
            | "load"
            | "domcontentloaded"
            | "networkidle"
            | "commit",
          timeout,
        });

        if (waitForSelector) {
          logger.debug(`[Playwright] Waiting for selector: ${waitForSelector}`);
          await page.waitForSelector(waitForSelector, { timeout });
        }

        if (waitForFunction) {
          logger.debug(`[Playwright] Waiting for function: ${waitForFunction}`);
          await page.waitForFunction(waitForFunction, { timeout });
        }

        if (additionalDelay > 0) {
          logger.debug(`[Playwright] Additional delay: ${additionalDelay}ms`);
          await page.waitForTimeout(additionalDelay);
        }

        contentType = response?.headers()["content-type"] || "text/html";
        const isHtml = contentType.includes("text/html");

        if (isHtml) {
          content = await page.content();
        } else {
          const bodyBuffer = await response?.body();
          content = bodyBuffer ? bodyBuffer.toString() : "";
        }
      } else {
        try {
          const urlObj = new URL(url);
          await page
            .goto(urlObj.origin, {
              waitUntil: waitUntil as
                | "load"
                | "domcontentloaded"
                | "networkidle"
                | "commit",
              timeout: timeout / 2,
            })
            .catch(() => {});
        } catch (e) {}

        const result = await page.evaluate(
          async ({ url, method, body, formData, headers }) => {
            const fetchOptions: any = {
              method,
              headers: headers || {},
            };

            if (formData) {
              const params = new URLSearchParams();
              for (const key in formData) {
                params.append(key, formData[key]);
              }
              fetchOptions.body = params;
            } else if (body) {
              if (typeof body === "object") {
                fetchOptions.body = JSON.stringify(body);
                if (!fetchOptions.headers["Content-Type"]) {
                  fetchOptions.headers["Content-Type"] = "application/json";
                }
              } else {
                fetchOptions.body = body;
              }
            }

            const response = await fetch(url, fetchOptions);
            const text = await response.text();

            const responseHeaders: Record<string, string> = {};
            response.headers.forEach((val, key) => {
              responseHeaders[key] = val;
            });

            return {
              content: text,
              contentType: responseHeaders["content-type"] || "text/plain",
            };
          },
          { url, method, body, formData, headers },
        );

        content = result.content;
        contentType = result.contentType;
      }

      const responseTime = Date.now() - startTime;

      logger.info(
        `[Playwright] Success: ${url} (${responseTime}ms, ${content.length} bytes, type: ${contentType})`,
      );

      return {
        success: true,
        content,
        type: contentType,
        method: useProxy ? "playwright-proxy" : "playwright-direct",
        responseTime,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      logger.error(`[Playwright] Error: ${url} - ${error.message}`);

      return {
        success: false,
        content: "",
        type: "",
        method: useProxy ? "playwright-proxy" : "playwright-direct",
        responseTime,
        error: error.message || "Unknown error",
      };
    } finally {
      if (page) {
        await page.close().catch((err) => {
          logger.error("[Playwright] Error closing page:", err);
        });
      }
      if (context) {
        await context.close().catch((err) => {
          logger.error("[Playwright] Error closing context:", err);
        });
      }
    }
  }
}
