import { Request, Response, NextFunction } from "express";

export const validateScraperRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { url, options = {} } = req.body;

  if (!url || typeof url !== "string") {
    res.status(400).json({
      success: false,
      error: "URL is required and must be a string",
    });
    return;
  }

  try {
    new URL(url);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: "Invalid URL format",
    });
    return;
  }

  if (options.strategy) {
    const validStrategies = ["cloudscraper", "playwright", "auto"];
    if (!validStrategies.includes(options.strategy)) {
      res.status(400).json({
        success: false,
        error: `Invalid strategy. Must be one of: ${validStrategies.join(", ")}`,
      });
      return;
    }
  }

  if (
    options.timeout &&
    (typeof options.timeout !== "number" || options.timeout <= 0)
  ) {
    res.status(400).json({
      success: false,
      error: "Timeout must be a positive number",
    });
    return;
  }

  if (options.maxRetries !== undefined) {
    if (
      typeof options.maxRetries !== "number" ||
      options.maxRetries < 0 ||
      options.maxRetries > 10
    ) {
      res.status(400).json({
        success: false,
        error: "maxRetries must be a number between 0 and 10",
      });
      return;
    }
  }

  if (options.cacheTTL !== undefined) {
    if (typeof options.cacheTTL !== "number" || options.cacheTTL <= 0) {
      res.status(400).json({
        success: false,
        error: "cacheTTL must be a positive number",
      });
      return;
    }
  }

  next();
};
