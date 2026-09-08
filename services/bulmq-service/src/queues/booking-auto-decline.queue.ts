import { Queue } from "bullmq";
import { connection } from "../config/redis";

export const autoDeclineQueue = new Queue("booking-auto-decline", {
  connection,
});
