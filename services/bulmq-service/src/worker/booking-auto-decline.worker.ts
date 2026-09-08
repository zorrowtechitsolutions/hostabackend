import { connection } from "../config/redis";
import dotenv from "dotenv";
import axios from "axios";
import { Worker } from "bullmq";

dotenv.config();

export const autoDeclineWorker = new Worker(
  "booking-auto-decline",
  async (job) => {
    const { bookingId } = job.data;
    console.log(`[AUTO-DECLINE WORKER] Processing auto-decline for booking ID: ${bookingId}`);

    try {
      // Internal call to booking service to trigger auto-decline
      // We pass the internal service secret in the headers for authorization
      const response = await axios.put(
        `${process.env.BOOKING_SERVICE_URL}/booking/internal/${bookingId}/auto-decline`,
        {},
        {
          headers: {
            "x-service-secret": process.env.INTERNAL_SERVICE_SECRET,
          },
          timeout: 10000,
        }
      );

      console.log(`[AUTO-DECLINE WORKER] Successfully auto-declined booking ${bookingId}`);
      return response.data;
    } catch (error: any) {
      console.error(`[AUTO-DECLINE WORKER] Error declining booking ${bookingId}:`, error.message);
      // We do not want to automatically retry if the booking-service says it's not found or already processed
      if (error.response && [404, 400].includes(error.response.status)) {
         console.log(`[AUTO-DECLINE WORKER] Booking ${bookingId} not eligible for auto-decline anymore. Marking job as completed.`);
         return; // Mark job as done
      }
      throw error; // Will be retried
    }
  },
  { connection }
);

autoDeclineWorker.on("completed", (job) => {
  console.log(`[AUTO-DECLINE WORKER] Job ${job.id} completed.`);
});

autoDeclineWorker.on("failed", (job, err) => {
  console.error(`[AUTO-DECLINE WORKER] Job ${job?.id} failed:`, err.message);
});
