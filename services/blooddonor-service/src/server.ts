// import app from "./app";
// import { connectDB } from "./config/db";
// import { connectRabbitMQ } from "./events/publisher";
// import { env } from "./config/env";
// import { logger } from "./utils/logger";

// import { startSubscriber } from "./events/subscriber";

// const PORT = env.PORT;

// // Database Connection and Server Startup
// const startServer = async () => {
//     try {
//         await connectDB();
//         await connectRabbitMQ();
        
//         // Start waiting for RabbitMQ events 
//         await startSubscriber();
        
//         // Starting blood Service
//         const server = app.listen(PORT, () => {
//             logger.info(`🚀 Blood Service is running on port ${PORT}`);
//         });

//         // Graceful Shutdown Handler
//         process.on("SIGTERM", async () => {
//             logger.info("SIGTERM received. Shutting down gracefully...");
//             server.close(() => {
//                 logger.info("HTTP server closed.");
//             });
//             // Example closing DB connection (Assuming imported sequelize from db.ts if needed):
//             // await sequelize.close();
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

import { startSubscriber } from "./events/subscriber";

const PORT = env.PORT;

let rabbitReconnectDelay = 1000;

const startRabbitMQ = async (): Promise<void> => {
    try {
        await connectRabbitMQ();

        // Start waiting for RabbitMQ events
        await startSubscriber();

        rabbitReconnectDelay = 1000;

        logger.info("✅ RabbitMQ Connected & Subscriber Started");
    } catch (err) {
        logger.error("RabbitMQ connection failed", { err });

        logger.info(`Retrying RabbitMQ in ${rabbitReconnectDelay / 1000}s`);

        setTimeout(() => {
            startRabbitMQ();
        }, rabbitReconnectDelay);

        rabbitReconnectDelay = Math.min(rabbitReconnectDelay * 2, 30000);
    }
};

// Database Connection and Server Startup
const startServer = async () => {
    try {
        // Database is mandatory
        await connectDB();

        // Starting Blood Service
        const server = app.listen(PORT, () => {
            logger.info(`🚀 Blood Service is running on port ${PORT}`);
        });

        // RabbitMQ connects (and subscriber starts) in background
        startRabbitMQ();

        // Graceful Shutdown Handler
        process.on("SIGTERM", async () => {
            logger.info("SIGTERM received. Shutting down gracefully...");
            server.close(() => {
                logger.info("HTTP server closed.");
            });
            // Example closing DB connection (Assuming imported sequelize from db.ts if needed):
            // await sequelize.close();
            process.exit(0);
        });

    } catch (error) {
        logger.error("❌ Failed to start server:", { error });
        process.exit(1);
    }
};

startServer();