import { Request, Response, NextFunction } from "express";

export const sanitizeInput = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    validateObject(req.query);
  }

  if (req.params) {
    validateObject(req.params);
  }

  next();
};

function sanitizeObject(obj: any): any {
  if (typeof obj === "string") {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj && typeof obj === "object") {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

function sanitizeString(str: string): string {
  str = str.replace(/\0/g, "");
  str = str.trim();

  if (!isUrl(str) && str.length > 10000) {
    str = str.substring(0, 10000);
  }

  return str;
}

function isUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

function validateObject(obj: any): void {
  if (typeof obj === "string") {
    validateString(obj);
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach(validateObject);
    return;
  }

  if (obj && typeof obj === "object") {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        validateObject(obj[key]);
      }
    }
  }
}

function validateString(str: string): void {
  if (str.includes("\0")) {
    throw new Error("Invalid input: null bytes not allowed");
  }

  if (str.length > 100000) {
    throw new Error("Invalid input: string too long");
  }
}
