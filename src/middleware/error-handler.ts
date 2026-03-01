import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error(err.message || "Internal server error", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
    }),
  });
};
