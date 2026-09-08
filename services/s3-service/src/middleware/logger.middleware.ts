import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { logger } from "../utils/logger";

export const requestLogger = (req: any, res: Response, next: NextFunction) => {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  req.id = requestId;

  logger.info("Incoming request", {
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip,
  });

  next();
};
