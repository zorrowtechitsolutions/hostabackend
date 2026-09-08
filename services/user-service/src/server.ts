// import app from "./app";
// import { connectDB } from "./config/db";
// import { connectRabbitMQ } from "./events/publisher";
// import { env } from "./config/env";
// import { logger } from "./utils/logger";
// import { startCleanupJob } from "./utils/cleanup";

// const PORT = env.PORT;

// // Database Connection and Server Startup
// const startServer = async () => {
//     try {
//         await connectDB();
//         await connectRabbitMQ();


        
//         // Start background blacklist cleanup job
//         startCleanupJob();


//            const { default: User } = await import("./models/user.model");
// const { default: Prescription } = await import("./models/prescription.model");
// const { default: PatientVitals } = await import("./models/patientVitals.model");
// const { default: Patient } = await import("./models/patient.model");
// const { default: Document } = await import("./models/document.model");
// const { default: LabResult } = await import("./models/labResult.model");


//         if (process.env.NODE_ENV !== 'production') {
//             await User.sync();
//             await Patient.sync();
//             await PatientVitals.sync();
//             await Prescription.sync();
//             await Document.sync();
//             await LabResult.sync();
//         }
        
//         // Starting user Service
//         const server = app.listen(PORT, () => {
//             logger.info(`🚀 User Service is running on port ${PORT}`);
//         });

//         // Graceful Shutdown Handler
//         process.on("SIGTERM", () => {
//             logger.info("SIGTERM received. Shutting down gracefully...");
//             server.close(async () => {
//                 logger.info("HTTP server closed.");
//                 // Add any other cleanup here (DB, RabbitMQ)
//                 process.exit(0);
//             });

//             // Force exit after 10s if server.close is stuck
//             setTimeout(() => {
//                 logger.error("Could not close connections in time, forcefully shutting down");
//                 process.exit(1);
//             }, 10000);
//         });
        
//     } catch (error) {
//         logger.error("❌ Failed to start server:", { error });
//         process.exit(1);
//     }
// };

// startServer();





import app from "./app";
import { connectDB } from "./config/db";
import { connectRabbitMQ } from "./events/publisher";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { startCleanupJob } from "./utils/cleanup";

const PORT = env.PORT;

let rabbitReconnectDelay = 1000;

const startRabbitMQ = async (): Promise<void> => {
    try {
        await connectRabbitMQ();

        rabbitReconnectDelay = 1000;

        logger.info("✅ RabbitMQ Connected");
    } catch (err) {
        logger.error("RabbitMQ connection failed", { err });

        logger.info(`Retrying RabbitMQ in ${rabbitReconnectDelay / 1000}s`);

        setTimeout(() => {
            startRabbitMQ();
        }, rabbitReconnectDelay);

        rabbitReconnectDelay = Math.min(rabbitReconnectDelay * 2, 30000);
    }
};

const syncDevSchema = async (): Promise<void> => {
    if (process.env.NODE_ENV === 'production') {
        logger.info("ℹ️  Production mode: schema managed by SQL migrations.");
        return;
    }

    const { default: User } = await import("./models/user.model");
    const { default: Prescription } = await import("./models/prescription.model");
    const { default: PatientVitals } = await import("./models/patientVitals.model");
    const { default: Patient } = await import("./models/patient.model");
    const { default: Document } = await import("./models/document.model");
    const { default: LabResult } = await import("./models/labResult.model");

    await User.sync();
    await Patient.sync();
    await PatientVitals.sync();
    await Prescription.sync();
    await Document.sync();
    await LabResult.sync();

    logger.warn("⚠️  Dev mode: schema auto-synced. Use migrations in production!");
};

// Database Connection and Server Startup
const startServer = async () => {
    try {
        // Database is mandatory
        await connectDB();

        // Ensure tables are in sync — DEV ONLY
        // In production, schema is managed by SQL migrations
        await syncDevSchema();

        // Start background blacklist cleanup job
        startCleanupJob();

        // Starting User Service
        const server = app.listen(PORT, () => {
            logger.info(`🚀 User Service is running on port ${PORT}`);
        });

        // RabbitMQ connects in background
        startRabbitMQ();

        // Graceful Shutdown Handler
        process.on("SIGTERM", () => {
            logger.info("SIGTERM received. Shutting down gracefully...");
            server.close(async () => {
                logger.info("HTTP server closed.");
                // Add any other cleanup here (DB, RabbitMQ)
                process.exit(0);
            });

            // Force exit after 10s if server.close is stuck
            setTimeout(() => {
                logger.error("Could not close connections in time, forcefully shutting down");
                process.exit(1);
            }, 10000);
        });

    } catch (error) {
        logger.error("❌ Failed to start server:", { error });
        process.exit(1);
    }
};

startServer();