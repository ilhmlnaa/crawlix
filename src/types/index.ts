export interface ScraperOptions {
  strategy?: "cloudscraper" | "playwright" | "auto";
  useProxy?: boolean;
  proxyUrl?: string;
  timeout?: number;
  waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
  waitForSelector?: string;
  waitForFunction?: string;
  additionalDelay?: number;
  method?: string;
  body?: any;
  formData?: Record<string, any>;
  headers?: Record<string, string>;
  useCache?: boolean;
  cacheTTL?: number;
  cacheKey?: string;
  maxRetries?: number;
  retryDelay?: number;
}

export interface ScraperResult {
  success: boolean;
  content: string;
  type: string;
  method: string;
  responseTime: number;
  fromCache?: boolean;
  cached?: boolean;
  error?: string;
  retries?: number;
}

export interface CacheEntry {
  content: string;
  type: string;
  method: string;
  responseTime: number;
  timestamp: number;
}

export interface BrowserPoolStats {
  direct: {
    active: boolean;
    contexts: number;
  };
  proxy: {
    active: boolean;
    contexts: number;
  };
}
