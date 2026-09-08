import { Queue } from "bullmq";
import { connection } from "../config/redis";

export const medicinQueue = new Queue("medicin-queue", {
  connection,
});