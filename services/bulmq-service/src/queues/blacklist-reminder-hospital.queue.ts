import { Queue } from "bullmq";
import { connection } from "../config/redis";

export const blacklistReminderHospitalQueue = new Queue(
    "blacklist-reminder-hospital-queue",
    {
        connection,
    }
);  