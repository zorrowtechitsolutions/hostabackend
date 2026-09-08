// middleware/internalAuth.ts

import { Request, Response, NextFunction } from "express";

export const verifyInternalRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const secret = req.headers["x-service-secret"];

  if (secret !== process.env.INTERNAL_SERVICE_SECRET) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized service",
    });
  }

  next();
};