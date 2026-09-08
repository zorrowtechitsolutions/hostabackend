import { Worker } from "bullmq";
import dotenv from "dotenv";
import twilio from "twilio";

import { connection } from "../config/redis";

dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const blacklistReminderHospitalWorker = new Worker(

  "blacklist-reminder-hospital-queue",

  async (job) => {

    const {
      hospitalId,
      hospitalName,
      phone,
      body,
    } = job.data;

    console.log("📋 Processing blacklist reminder job:", { hospitalId, hospitalName, phone, body });

    try {
      const response = await client.messages.create({
        to: "whatsapp:+91" + phone,
        from: "whatsapp:+14155238886", // Twilio WhatsApp Sandbox number
        body,
      });

      console.log(`✅ WhatsApp reminder sent to hospital ${hospitalName}. SID: ${response.sid}`);
    } catch (error) {
      console.error(`❌ Failed to send WhatsApp to hospital ${hospitalName}:`, error);
      throw error; // Re-throw so BullMQ marks job as failed
    }

  },

  {
    connection,
  }
);

blacklistReminderHospitalWorker.on(
  "completed",
  (job) => {
    console.log("Job completed:", job.id);
  }
);

blacklistReminderHospitalWorker.on(
  "failed",
  (job, err) => {
    console.error("Job failed:", err);
  }
);