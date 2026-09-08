// import app from "./app";

// import { connectDB } from "./config/db";
// import { connectRabbitMQ } from "./events/publisher";
// import { connectRabbitMQConsumer } from "./events/consumer";
// import { env } from "./config/env";
// import { logger } from "./utils/logger";
// import { startCleanupJob } from "./utils/cleanup";

// const PORT = env.PORT;

// // Database Connection and Server Startup
// const startServer = async () => {
//     try {
//         await connectDB();
//         await connectRabbitMQ();
//         await connectRabbitMQConsumer();
//         // Ensure tables are in sync — DEV ONLY
//         // In production, schema is managed by SQL migrations (src/migrations/)
//         if (env.NODE_ENV === 'development') {
//             const { default: Hospital } = await import("./models/hospital.model");
//             const { default: TemplateItem } = await import("./models/prescription.model");
//             await Hospital.sync({ alter: true });
//             await TemplateItem.sync({ alter: true });
//             console.warn('⚠️  Dev mode: schema auto-synced. Use migrations in production!');
//         } else {
//             console.log('ℹ️  Production mode: schema managed by SQL migrations.');
//         }
        
//         // Start background cleanup for blacklisted hospitals
//         startCleanupJob();
        
//         // Starting Hospital Service
//         const server = app.listen(PORT, () => {
//             logger.info(`🚀 Hospital Service is running on port ${PORT}`);
//         });

//         // Graceful Shutdown Handler
//         process.on("SIGTERM", async () => {
//             logger.info("SIGTERM received. Shutting down gracefully...");
//             server.close(() => {
//                 logger.info("HTTP server closed.");
//             });
//             process.exit(0);
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
import { connectRabbitMQConsumer } from "./events/consumer";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { startCleanupJob } from "./utils/cleanup";

const PORT = env.PORT;

let rabbitReconnectDelay = 1000;

const startRabbitMQ = async (): Promise<void> => {
    try {
        await connectRabbitMQ();
        await connectRabbitMQConsumer();

        rabbitReconnectDelay = 1000;

        logger.info("✅ RabbitMQ Connected");
    } catch (err) {
        logger.error("RabbitMQ connection failed", { err });

        logger.info(
            `Retrying RabbitMQ in ${rabbitReconnectDelay / 1000}s`
        );

        setTimeout(() => {
            startRabbitMQ();
        }, rabbitReconnectDelay);

        rabbitReconnectDelay = Math.min(
            rabbitReconnectDelay * 2,
            30000
        );
    }
};

const syncDevSchema = async (): Promise<void> => {
    if (env.NODE_ENV !== "development") {
        logger.info("ℹ️  Production mode: schema managed by SQL migrations.");
        return;
    }

    const { default: Hospital } = await import("./models/hospital.model");
    const { default: TemplateItem } = await import("./models/prescription.model");

    await Hospital.sync({ alter: true });
    await TemplateItem.sync({ alter: true });

    logger.warn("⚠️  Dev mode: schema auto-synced. Use migrations in production!");
};

const startServer = async () => {
    try {
        // Database is mandatory
        await connectDB();

        // Ensure tables are in sync — DEV ONLY
        // In production, schema is managed by SQL migrations (src/migrations/)
        await syncDevSchema();

        startCleanupJob();

        const server = app.listen(PORT, () => {
            logger.info(
                `🚀 Hospital Service running on port ${PORT}`
            );
        });

        // RabbitMQ connects in background
        startRabbitMQ();

        process.on("SIGTERM", async () => {
            logger.info("SIGTERM received.");

            server.close(() => {
                logger.info("HTTP server closed.");
            });

            process.exit(0);
        });
    } catch (error) {
        logger.error("Failed to start Hospital Service", { error });

        process.exit(1);
    }
};

startServer();