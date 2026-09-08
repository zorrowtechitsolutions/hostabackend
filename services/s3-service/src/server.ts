import app from "./app";

import { connectRabbitMQ } from "./events/publisher";
import { env } from "./config/env";
import { logger } from "./utils/logger";


const PORT = env.PORT;

// Database Connection and Server Startup
const startServer = async () => {
    try {
       
        await connectRabbitMQ();
        
  
        // Starting blood Service
        app.listen(PORT, () => {
            logger.info(`🚀 S3 Service is running on port ${PORT}`);
        });
    } catch (error) {
        logger.error("❌ Failed to start server:", { error });
        process.exit(1);
    }
};

startServer();
