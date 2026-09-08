import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          message: "Validation failed",
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            details: errorMessages,
          },
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: "Invalid request data",
        data: null,
        error: {
          code: "INVALID_DATA",
          details: null,
        },
      });
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          message: "Invalid parameters",
          data: null,
          error: {
            code: "INVALID_PARAMS",
            details: errorMessages,
          },
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: "Invalid request parameters",
        data: null,
        error: {
          code: "INVALID_PARAMS",
          details: null,
        },
      });
    }
  };
};
