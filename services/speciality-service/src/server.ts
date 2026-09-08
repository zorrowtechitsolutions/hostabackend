// import app from "./app";

// import { connectDB } from "./config/db";
// import { connectRabbitMQ } from "./events/publisher";
// import { env } from "./config/env";
// import { logger } from "./utils/logger";

// const PORT = env.PORT;

// // Database Connection and Server Startup
// const startServer = async () => {
//     try {
//         await connectDB();
//         await connectRabbitMQ();

//         const { default: Category } = await import("./models/category.model");
// const { default: Speciality } = await import("./models/speciality.model");


// if (process.env.NODE_ENV !== 'production') {
//     await Category.sync({ alter: true });
//     await Speciality.sync({ alter: true });
// }
        

//         // Starting Speciality Service
//         const server = app.listen(PORT, () => {
//             logger.info(`🚀 Speciality Service is running on port ${PORT}`);
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
import { env } from "./config/env";
import { logger } from "./utils/logger";

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

    const { default: Category } = await import("./models/category.model");
    const { default: Speciality } = await import("./models/speciality.model");

    await Category.sync({ alter: true });
    await Speciality.sync({ alter: true });

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

        // Starting Speciality Service
        const server = app.listen(PORT, () => {
            logger.info(`🚀 Speciality Service is running on port ${PORT}`);
        });

        // RabbitMQ connects in background
        startRabbitMQ();

        // Graceful Shutdown Handler
        process.on("SIGTERM", async () => {
            logger.info("SIGTERM received. Shutting down gracefully...");
            server.close(() => {
                logger.info("HTTP server closed.");
            });
            process.exit(0);
        });
    } catch (error) {
        logger.error("❌ Failed to start server:", { error });
        process.exit(1);
    }
};

startServer();


