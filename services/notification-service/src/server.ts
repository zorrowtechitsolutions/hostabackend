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

//         const { startConsumer } = await import("./events/consumer");
//         await startConsumer();


//         app.listen(PORT, () => {
//             logger.info(`🚀 Notification Service is running on port ${PORT}`);
//         });

//     } catch (error) {

//         logger.error("❌ Failed to start server:", { error });

//         process.exit(1);
//     }
// };

// startServer();

// const handleShutdown = async (signal: string) => {

//     logger.info(`Received ${signal}. Starting graceful shutdown...`);

//     try {
//         const { closeRabbitMQ } = await import("./events/consumer");
//         const { default: sequelize } = await import("./config/db");

//         await closeRabbitMQ();

//         await sequelize.close();

//         logger.info(
//             "✅ Database and RabbitMQ connections cleanly closed. Goodbye!"
//         );

//         process.exit(0);

//     } catch (err) {

//         logger.error(
//             "❌ Error during graceful shutdown:",
//             { error: err }
//         );

//         process.exit(1);
//     }
// };

// process.on("SIGTERM", () => handleShutdown("SIGTERM"));

// process.on("SIGINT", () => handleShutdown("SIGINT"));


import app from "./app";
import { connectDB } from "./config/db";
import { connectRabbitMQ } from "./events/publisher";
import { env } from "./config/env";
import { logger } from "./utils/logger";

const PORT = env.PORT;

let server: ReturnType<typeof app.listen>;

let rabbitReconnectDelay = 1000;

const startRabbitMQ = async (): Promise<void> => {
    try {
        await connectRabbitMQ();

        const { startConsumer } = await import("./events/consumer");
        await startConsumer();

        rabbitReconnectDelay = 1000;

        logger.info("✅ RabbitMQ Connected & Consumer Started");
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

        server = app.listen(PORT, () => {
            logger.info(`🚀 Notification Service is running on port ${PORT}`);
        });

        // RabbitMQ connects (and starts the consumer) in background
        startRabbitMQ();

    } catch (error) {
        logger.error("❌ Failed to start server:", { error });
        process.exit(1);
    }
};

startServer();

const handleShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    try {
        const { closeRabbitMQ } = await import("./events/consumer");
        const { default: sequelize } = await import("./config/db");

        if (server) {
            await new Promise<void>((resolve) => server.close(() => resolve()));
            logger.info("HTTP server closed.");
        }

        await closeRabbitMQ();
        await sequelize.close();

        logger.info(
            "✅ Database and RabbitMQ connections cleanly closed. Goodbye!"
        );

        process.exit(0);

    } catch (err) {
        logger.error("❌ Error during graceful shutdown:", { error: err });
        process.exit(1);
    }
};

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

