import app from "./app";

import { connectRabbitMQ } from "./events/publisher";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import {  bookingWorker } from "./worker/booking-remainder-user.worker";
import { bookingWorkerHospital } from "./worker/booking-remainder-hospital.worker";
import medicinWorker from "./worker/medicin-remainder.worker";
import { blacklistReminderHospitalWorker } from "./worker/blacklist-hospital-worker";
import { autoDeclineWorker } from "./worker/booking-auto-decline.worker";


const PORT = env.PORT;

// Database Connection and Server Startup
const startServer = async () => {
    try {
       
        await connectRabbitMQ();
        
      await  medicinWorker;
      await bookingWorkerHospital;
      await bookingWorker;
      await blacklistReminderHospitalWorker;
      await autoDeclineWorker;

        // Starting blood Service
        app.listen(PORT, () => {
            logger.info(`🚀 Bulmq Service is running on port ${PORT}`);
        });
    } catch (error) {
        logger.error("❌ Failed to start server:", { error });
        process.exit(1);
    }
};

startServer();
