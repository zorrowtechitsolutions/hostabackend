import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export const errorHandler = (err: any, req: any, res: Response, next: NextFunction) => {
  logger.error("Server error", {
    requestId: req.id,
    message: err.message,
    stack: err.stack,
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error in API Gateway",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
};
