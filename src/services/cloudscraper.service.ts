import cloudscraper from "cloudscraper";
import { config } from "../config";
import { logger } from "../utils/logger";
import { ScraperResult, ScraperOptions } from "../types";
import { IScraperStrategy } from "../interfaces/scraper-strategy.interface";

interface CloudscraperRequestOptions {
  uri: string;
  method?: string;
  body?: any;
  form?: any;
  formData?: any;
  timeout?: number;
  proxy?: string;
  headers?: Record<string, string>;
  gzip?: boolean;
  challengesToSolve?: number;
}

export class CloudscraperService implements IScraperStrategy {
  private static instance: CloudscraperService;

  private readonly DEFAULT_HEADERS = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
  };

  private constructor() {}

  public static getInstance(): CloudscraperService {
    if (!CloudscraperService.instance) {
      CloudscraperService.instance = new CloudscraperService();
    }
    return CloudscraperService.instance;
  }

  async fetch(
    url: string,
    options: ScraperOptions = {},
  ): Promise<ScraperResult> {
    const {
      useProxy = false,
      timeout,
      headers,
      method,
      body,
      formData,
    } = options;
    const startTime = Date.now();
    const proxyUrl = useProxy ? config.scraper.proxyUrl : undefined;

    try {
      const encodedUrl = new URL(url).href;
      const requestOptions: CloudscraperRequestOptions = {
        uri: encodedUrl,
        method: method || "GET",
        body,
        form: formData,
        timeout: timeout || config.scraper.defaultTimeout,
        headers: {
          ...this.DEFAULT_HEADERS,
          ...(headers || {}),
        },
        gzip: true,
        challengesToSolve: 3,
      };

      if (proxyUrl) {
        requestOptions.proxy = proxyUrl;
        logger.debug(
          `[Cloudscraper] Using proxy: ${proxyUrl.replace(/:[^:]+@/, ":****@")}`,
        );
      }

      const response = await cloudscraper({
        ...requestOptions,
        resolveWithFullResponse: true,
      });

      const content =
        typeof response.body === "string"
          ? response.body
          : JSON.stringify(response.body);
      const contentType = response.headers["content-type"] || "text/html";
      const responseTime = Date.now() - startTime;

      logger.info(
        `[Cloudscraper] Success: ${url} (${responseTime}ms, ${content.length} bytes, type: ${contentType})`,
      );

      return {
        success: true,
        content,
        type: contentType,
        method: proxyUrl ? "cloudscraper-proxy" : "cloudscraper-direct",
        responseTime,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      logger.error(`[Cloudscraper] Error: ${url} - ${error.message}`);

      return {
        success: false,
        content: "",
        type: "",
        method: proxyUrl ? "cloudscraper-proxy" : "cloudscraper-direct",
        responseTime,
        error: error.message || "Unknown error",
      };
    }
  }
}
