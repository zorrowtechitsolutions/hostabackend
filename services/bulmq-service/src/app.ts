import express, {
  Request,
  Response,
  NextFunction,
} from "express";

import cors from "cors";
import helmet from "helmet";

import bookinguserRoutes from "./routes/booking-remainder-user.routes";
import bookingHospitalRoutes from "./routes/booking-remainder-hospital.routes";
import bookingAutoDeclineRoutes from "./routes/booking-auto-decline.routes";
import medcinRemainerRoutes from "./routes/medicin-remainder.routes";

import blacklistReminderHospitalRoutes from "./routes/blacklist-reminder-hospital.routes";

import { requestLogger } from "./middleware/logger.middleware";
import { logger } from "./utils/logger";
import { env } from "./config/env";

const app = express();

/**
 * TRUST PROXY
 */
app.set("trust proxy", 1);

/**
 * SECURITY
 */
app.use(helmet());

/**
 * LOGGER
 */
app.use(requestLogger);

/**
 * CORS
 */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://hostahospital.com",
    ],

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
    ],

    credentials: true,
  })
);

/**
 * BODY PARSER
 */
app.use(express.json({ limit: "10mb" }));

app.use(
  express.urlencoded({
    limit: "10mb",
    extended: true,
  })
);

/**
 * ROUTES
 */
app.use("/", medcinRemainerRoutes);

app.use("/", bookinguserRoutes);

app.use("/", bookingHospitalRoutes);

app.use("/", bookingAutoDeclineRoutes);

app.use("/", blacklistReminderHospitalRoutes);

/**
 * HEALTH CHECK
 */
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    service: "bulmq-service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  });
});

/**
 * 404 HANDLER
 */
app.use(
  (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    res.status(404).json({
      success: false,
      status: 404,
      message:
        "Requested bulmq-related resource not found",
      path: req.path,
    });
  }
);

/**
 * GLOBAL ERROR HANDLER
 */
app.use(
  (
    err: any,
    req: any,
    res: Response,
    next: NextFunction
  ) => {

    logger.error("Server error", {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      message: err.message,
      stack: err.stack,
    });

    res.status(err.status || 500).json({
      success: false,

      message:
        err.message || "Internal Server Error in Bulmq Service",

      error:
        env.NODE_ENV === "development"
          ? {
              message: err.message,
              stack: err.stack,
            }
          : {},
    });
  }
);

export default app;
