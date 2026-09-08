import express, {
    Request,
    Response,
    NextFunction,
} from "express";

import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import hospitalRoutes from "./routes/hospital.routes";
import prescriptionTemplateRoutes from "./routes/prescription.routes";

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
 * INTERNAL CORS
 */
const allowedOrigins = [
  "http://localhost:5173",
  "https://hostahospital.com",
  "https://www.hostahospital.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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

app.use(cookieParser());

/**
 * ROUTES
 */
app.use("/", hospitalRoutes);
app.use("/", prescriptionTemplateRoutes);

/**
 * HEALTH
 */
app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
        status: "healthy",
        service: "hospital-service",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: env.NODE_ENV,
    });
});

/**
 * 404
 */
app.use(
    (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        res.status(404).json({
            status: 404,
            message:
                "Requested hospital-related resource not found",
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
            message: err.message,
            stack: err.stack,
        });

        // Sequelize validation error → 400
        if (err.name === "SequelizeValidationError") {
            const messages = err.errors?.map((e: any) => e.message) ?? [err.message];
            res.status(400).json({
                success: false,
                message: messages.join(", "),
                error: { code: "VALIDATION_ERROR", details: messages },
            });
            return;
        }

        // Sequelize unique constraint violation → 409
        if (err.name === "SequelizeUniqueConstraintError") {
            const field = err.errors?.[0]?.path ?? "field";
            res.status(409).json({
                success: false,
                message: `${field} already exists`,
                error: { code: "DUPLICATE_ENTRY", details: field },
            });
            return;
        }

        res.status(err.status || 500).json({
            success: false,
            message: err.message || "Internal Server Error in Hospital Service",
            error: {
                message: err.message,
                code: err.code || "INTERNAL_SERVER_ERROR",
                details: err.errors || err.details || null,
            },
        });
    }
);

export default app;
