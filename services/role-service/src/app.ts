// import express, { Request, Response, NextFunction } from "express";
// import cors from "cors";

// import helmet from "helmet";
// import rateLimit from "express-rate-limit";
// import roleRoutes from "./routes/role.routes";
// import permissionRoutes from "./routes/permission.routes";
// import rolepermissionRoutes from "./routes/rolepermission.routes";

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
// app.use("/role/login", loginLimiter); // can be changed if logic changes

// // CORS
// app.use(cors({
//   origin: ["http://localhost:3000", "https://yourfrontend.com"], // Allowing local dev and prospective production
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   credentials: true,
// }));


// app.use(express.json({ limit: "10mb" }));
// app.use(express.urlencoded({ limit: "10mb", extended: true }));

// // ROUTES
// app.use("/", roleRoutes);
// app.use("/", permissionRoutes);
// app.use("/", rolepermissionRoutes);


// // Health check endpoint
// app.get("/health", (req: Request, res: Response) => {
//   res.status(200).json({
//     status: "healthy",
//     service: "role-service",
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     environment: env.NODE_ENV
//   });
// });


// // 404 handler
// app.use((req: Request, res: Response, next: NextFunction) => {
//   res.status(404).json({
//     status: 404,
//     message: "Requested role-related resource not found",

//   });
// });


// // Global Error handler with Winston
// app.use((err: any, req: any, res: Response, next: NextFunction) => {
//   logger.error("Server error", {
//     requestId: req.id,
//     message: err.message,
//     stack: err.stack,
//   });

//   res.status(err.status || 500).json({
//     success: false,
//     message: err.message || "Internal Server Error in Role Service",
//     error: env.NODE_ENV === "development" ? err : {}, // Still show object in dev, hide details in prod

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
// import cookieParser from "cookie-parser";

import roleRoutes from "./routes/role.routes";
import permissionRoutes from "./routes/permission.routes";
import rolepermissionRoutes from "./routes/rolepermission.routes";

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

// app.use(cookieParser());

/**
 * ROUTES
 */
app.use("/", roleRoutes);
app.use("/", permissionRoutes);
app.use("/", rolepermissionRoutes);

/**
 * HEALTH
 */
app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
        status: "healthy",
        service: "role-service",
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
                "Requested role-related resource not found",
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

            message:
                err.message || "Internal Server Error in Role Service",

            error:
                env.NODE_ENV === "development"
                    ? err
                    : {},
        });
    }
);

export default app;

