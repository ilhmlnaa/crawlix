import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export const preventParameterPollution = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const queryKeys = Object.keys(req.query);
  const uniqueKeys = new Set(queryKeys);

  if (queryKeys.length !== uniqueKeys.size) {
    logger.warn("Parameter pollution detected", {
      ip: req.ip,
      path: req.path,
      query: req.query,
    });

    res.status(400).json({
      success: false,
      error: "Invalid request parameters",
    });
    return;
  }

  next();
};

export const preventRequestSmuggling = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const contentLength = req.headers["content-length"];
  const transferEncoding = req.headers["transfer-encoding"];

  if (contentLength && transferEncoding) {
    logger.warn("Request smuggling attempt detected", {
      ip: req.ip,
      path: req.path,
    });

    res.status(400).json({
      success: false,
      error: "Invalid request headers",
    });
    return;
  }

  next();
};

export const validateContentType = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const contentType = req.headers["content-type"];

    if (!contentType || !contentType.includes("application/json")) {
      res.status(415).json({
        success: false,
        error: "Content-Type must be application/json",
      });
      return;
    }
  }

  next();
};

export const preventCRLFInjection = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const checkForCRLF = (str: string): boolean => {
    return /[\r\n]/.test(str);
  };

  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string" && checkForCRLF(value)) {
      logger.warn("CRLF injection attempt detected in headers", {
        ip: req.ip,
        header: key,
      });

      res.status(400).json({
        success: false,
        error: "Invalid request headers",
      });
      return;
    }
  }

  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === "string" && checkForCRLF(value)) {
      logger.warn("CRLF injection attempt detected in query", {
        ip: req.ip,
        param: key,
      });

      res.status(400).json({
        success: false,
        error: "Invalid query parameters",
      });
      return;
    }
  }

  next();
};

export const requestSizeLimiter = (maxSize: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);

    if (contentLength > maxSize) {
      logger.warn("Request size limit exceeded", {
        ip: req.ip,
        contentLength,
        maxSize,
      });

      res.status(413).json({
        success: false,
        error: "Request entity too large",
      });
      return;
    }

    next();
  };
};
