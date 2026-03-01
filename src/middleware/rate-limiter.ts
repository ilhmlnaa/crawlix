import rateLimit from "express-rate-limit";
import { config } from "../config";

export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (!config.rateLimit.bypassKey) return false;
    const bypassHeader = req.headers["x-bypass-rate-limit"];
    return bypassHeader === config.rateLimit.bypassKey;
  },
});
