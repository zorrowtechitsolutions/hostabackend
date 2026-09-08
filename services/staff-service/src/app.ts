// import express, { Request, Response, NextFunction } from "express";
// import cors from "cors";

// import helmet from "helmet";
// import cookieParser from "cookie-parser";
// import rateLimit from "express-rate-limit";
// import staffRoutes from "./routes/staff.routes";
// import { requestLogger } from "./middleware/logger.middleware";
// import { logger } from "./utils/logger";
// import { env } from "./config/env";

// const app = express();

// // Security middleware
// app.use(helmet());


// // Request Tracking & Logging
// app.use(requestLogger);

// // Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // Reduced from 1000 to production-typical 100

//   message: {
//     success: false,
//     message: "Too many requests from this IP, please try again later.",
//     error: { code: "RATE_LIMIT_EXCEEDED", details: null }
//   }
// });
// app.use(limiter);


// // Specific limit for login
// const loginLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000,
//     max: 5,
//     message: "Too many login attempts, please try again after 15 minutes."
// });
// app.use("/staff/login", loginLimiter); // can be changed if logic changes

// // CORS
// app.use(cors({
//   origin: ["http://localhost:3000", "https://yourfrontend.com"], // Allowing local dev and prospective production
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   credentials: true,
// }));


// app.use(express.json({ limit: "10mb" }));
// app.use(express.urlencoded({ limit: "10mb", extended: true }));
// app.use(cookieParser());

// // ROUTES
// app.use("/", staffRoutes);


// // Health check endpoint
// app.get("/health", (req: Request, res: Response) => {
//   res.status(200).json({
//     status: "healthy",
//     service: "staff-service",
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     environment: env.NODE_ENV
//   });
// });


// // 404 handler
// app.use((req: Request, res: Response, next: NextFunction) => {
//   res.status(404).json({
//     status: 404,
//     message: "Requested staff-related resource not found",
//   });
// });


// // Global Error handler with Winston
// app.use((err: any, req: any, res: Response, next: NextFunction) => {
//   logger.error("Server error", {
//     requestId: req.id,
//     message: err.message,
//     stack: err.stack,
//     details: err.errors || err // Capture Sequelize validation errors or the whole error object
//   });

//   res.status(err.status || 500).json({
//     success: false,
//     message: "Internal Server Error in Staff Service",
//     error: env.NODE_ENV === "development" ? err : (err.errors || {}), // Show errors if available even in prod for now to debug
//   });
// });

// export default app;






import express, {
    Request,
    Response,
    NextFunction,
} from "express";

import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import staffRoutes from "./routes/staff.routes";

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

app.use(cookieParser());

/**
 * ROUTES
 */
app.use("/", staffRoutes);

/**
 * HEALTH
 */
app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
        status: "healthy",
        service: "staff-service",
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
                "Requested staff-related resource not found",
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

        res.status(err.status || 500).json({
            success: false,
            message: err.message || "Internal Server Error in Staff Service",
            error: {
                message: err.message,
                code: err.code || "INTERNAL_SERVER_ERROR",
                details: err.errors || err.details || null,
            },
        });
    }
);

export default app;