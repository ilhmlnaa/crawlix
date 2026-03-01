import { chromium, Browser } from "playwright";
import { config } from "../config";
import { logger } from "../utils/logger";

interface BrowserPool {
  direct: Browser | null;
  proxy: Browser | null;
}

export class BrowserPoolManager {
  private static instance: BrowserPoolManager;
  private pool: BrowserPool = {
    direct: null,
    proxy: null,
  };
  private idleTimers: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;
  private isShuttingDown = false;

  private constructor() {}

  public static getInstance(): BrowserPoolManager {
    if (!BrowserPoolManager.instance) {
      BrowserPoolManager.instance = new BrowserPoolManager();
    }
    return BrowserPoolManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    logger.info("Initializing browser pool manager");
    this.isInitialized = true;
  }

  async getBrowser(useProxy: boolean = false): Promise<Browser> {
    if (this.isShuttingDown) {
      throw new Error("Browser pool is shutting down");
    }

    const poolKey = useProxy && config.scraper.proxyUrl ? "proxy" : "direct";

    if (this.pool[poolKey]) {
      this.resetIdleTimer(poolKey);
      return this.pool[poolKey]!;
    }

    logger.info(`Creating new ${poolKey} browser instance`);

    const launchOptions: any = {
      headless: config.playwright.headless,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920,1080",
      ],
    };

    if (config.playwright.executablePath) {
      launchOptions.executablePath = config.playwright.executablePath;
      logger.debug(
        `Using Chromium executable: ${config.playwright.executablePath}`,
      );
    }

    if (poolKey === "proxy" && config.scraper.proxyUrl) {
      launchOptions.proxy = {
        server: config.scraper.proxyUrl,
      };
      logger.debug(
        `Using proxy: ${config.scraper.proxyUrl.replace(/:[^:]+@/, ":****@")}`,
      );
    }

    const browser = await chromium.launch(launchOptions);
    this.pool[poolKey] = browser;
    this.resetIdleTimer(poolKey);

    return browser;
  }

  private resetIdleTimer(poolKey: "direct" | "proxy"): void {
    const existingTimer = this.idleTimers.get(poolKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      logger.info(`Browser ${poolKey} idle timeout reached, closing...`);
      await this.closeBrowser(poolKey);
    }, config.playwright.browserIdleTimeout);

    this.idleTimers.set(poolKey, timer);
  }

  private async closeBrowser(poolKey: "direct" | "proxy"): Promise<void> {
    const browser = this.pool[poolKey];
    if (!browser) {
      return;
    }

    try {
      logger.info(`Closing ${poolKey} browser`);
      await browser.close();
      this.pool[poolKey] = null;

      const timer = this.idleTimers.get(poolKey);
      if (timer) {
        clearTimeout(timer);
        this.idleTimers.delete(poolKey);
      }
    } catch (error) {
      logger.error(`Error closing ${poolKey} browser:`, error);
    }
  }

  async destroy(): Promise<void> {
    logger.info("Destroying browser pool");
    this.isShuttingDown = true;

    for (const timer of this.idleTimers.values()) {
      clearTimeout(timer);
    }
    this.idleTimers.clear();

    await Promise.all([
      this.closeBrowser("direct"),
      this.closeBrowser("proxy"),
    ]);

    this.isInitialized = false;
    logger.info("Browser pool destroyed");
  }

  getStats() {
    return {
      direct: {
        active: this.pool.direct !== null,
        contexts: this.pool.direct?.contexts().length || 0,
      },
      proxy: {
        active: this.pool.proxy !== null,
        contexts: this.pool.proxy?.contexts().length || 0,
      },
    };
  }
}
