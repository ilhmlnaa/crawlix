import { ScraperResult, ScraperOptions } from "../types";

export interface IScraperStrategy {
  fetch(url: string, options?: ScraperOptions): Promise<ScraperResult>;
}
