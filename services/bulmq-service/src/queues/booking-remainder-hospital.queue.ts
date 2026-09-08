import { Queue } from "bullmq";
import { connection } from "../config/redis";

export const bookingQueue = new Queue("booking-queue-hospital", {
  connection,
});

