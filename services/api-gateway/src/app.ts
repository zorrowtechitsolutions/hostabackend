import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { createProxyMiddleware, Options } from "http-proxy-middleware";
import http from "http";

import routes from "./routes";
import { errorHandler } from "./middleware/error.middleware";
import { env } from "./config/env";
import { requestLogger } from "./middleware/logger.middleware";
import { authAndMembershipMiddleware } from "./middleware/auth.middleware";
import dotenv from "dotenv";
dotenv.config();

const app = express();

/**
 * TRUST PROXY
 */
app.set("trust proxy", 1);

/**
 * SECURITY
 */
app.use(
    helmet({
        crossOriginResourcePolicy: {
            policy: "cross-origin",
        },
    })
);

/**
 * LOGGER
 */
app.use(requestLogger);

/**
 * BODY PARSER
 */
app.use(express.json({ limit: "10mb" }));

/**
 * GENERAL API LIMITER
 */
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests from this IP, please try again later.",
        error: {
            code: "RATE_LIMIT_EXCEEDED",
            details: null,
        },
    },
});

/**
 * APPLY GENERAL LIMITER
 */
app.use("/api", limiter);

/**
 * PROFESSIONAL LOGIN LIMITER
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any, res: any) => {
        const email = req.body?.email || req.body?.phone || "unknown";
        const ip = ipKeyGenerator(req, res);
        return `${ip}-${email}`;
    },
    message: {
        success: false,
        message: "Too many login attempts. Please try again after 15 minutes.",
        error: {
            code: "LOGIN_RATE_LIMIT_EXCEEDED",
            details: null,
        },
    },
});

/**
 * LOGIN ROUTES
 */
app.use("/api/users/login", loginLimiter);
app.use("/api/ambulance/login", loginLimiter);
app.use("/api/doctor/login", loginLimiter);
app.use("/api/staff/login", loginLimiter);
app.use("/api/hospital/login", loginLimiter);

/**
 * CORS — must be registered before auth middleware so preflight OPTIONS
 * requests are handled before any authentication check runs.
 */
app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://hostahospital.com",
            "https://www.hostahospital.com",
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
        allowedHeaders: [
            "Content-Type",
            "Authorization",
        ],
    })
);

/**
 * GLOBAL AUTH & MEMBERSHIP MIDDLEWARE
 */
app.use(authAndMembershipMiddleware);

// ==============================================
// WEBSOCKET PROXY - FIXED TYPESCRIPT VERSION
// ==============================================

/**
 * WebSocket Proxy for Socket.io
 * Proxies WebSocket connections to socketio-service
 */
const wsProxyOptions: any = {
    target: `${process.env.SOCKETIO_SERVICE_URL}`,  // Docker service name
    ws: true,  // Enable WebSocket proxying
    changeOrigin: true,
    // logLevel: "debug" - Remove this line, it's not in the types
    onProxyReq: (proxyReq, req, res) => {
        console.error("🔄 WebSocket proxy request:", req.url);
    },
    onProxyRes: (proxyRes, req, res) => {
        console.error("🔄 WebSocket proxy response:", proxyRes.statusCode);
    },
    onError: (err, req, res) => {
        console.error("❌ WebSocket proxy error:", err.message);
        res.status(500).send("WebSocket proxy error");
    }
};

app.use("/socket.io", createProxyMiddleware(wsProxyOptions));

/**
 * HTTP Proxy for Socket.io API endpoints
 * Forwards HTTP requests to socketio-service
 */
app.post("/api/emit-event", async (req: Request, res: Response) => {
    try {
       
        
        const response = await fetch(`${process.env.SOCKETIO_SERVICE_URL}/emit-event`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(req.body)
        });
        
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to emit event through gateway",
            error: error.message
        });
    }
});





/**
 * Debug endpoint for socket rooms
 */
app.get("/api/debug/rooms", async (req: Request, res: Response) => {
    try {
        const response = await fetch(`${process.env.SOCKETIO_SERVICE_URL}/debug/rooms`);
        const data = await response.json();
        res.json(data);
    } catch (error: any) {
        console.error("❌ Error fetching rooms:", error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Socket service health check
 */
app.get("/api/socket-health", async (req: Request, res: Response) => {
    try {
        const response = await fetch(`${process.env.SOCKETIO_SERVICE_URL}/health`);
        const data = await response.json();
        res.json({
            gateway: "healthy",
            socketService: data
        });
    } catch (error: any) {
        res.status(503).json({
            success: false,
            message: "Socket service is not available",
            error: error.message
        });
    }
});

// ==============================================
// END OF WEBSOCKET PROXY SECTION
// ==============================================

/**
 * HEALTH CHECK
 */
app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
        status: "healthy",
        service: "api-gateway",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: env.NODE_ENV,
        websocketProxy: true,
        socketEndpoint: "/socket.io"
    });
});

/**
 * ROUTES
 */
app.use("/api", routes);

/**
 * ERROR HANDLER
 */
app.use(errorHandler);

export default app;