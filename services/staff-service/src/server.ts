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
        
//         // Start background blacklist cleanup job
//         startCleanupJob();
        

//         // Starting Staff Service
//         const server = app.listen(PORT, () => {
//             logger.info(`🚀 Staff Service is running on port ${PORT}`);
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

// Database Connection and Server Startup
const startServer = async () => {
    try {
        // Database is mandatory
        await connectDB();

        // Start background blacklist cleanup job
        startCleanupJob();

        // Starting Staff Service
        const server = app.listen(PORT, () => {
            logger.info(`🚀 Staff Service is running on port ${PORT}`);
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