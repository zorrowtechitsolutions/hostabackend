import {connection} from "../config/redis";
import dotenv from "dotenv";
import twilio from "twilio";
import { Worker } from "bullmq";
import axios from "axios";

dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

const medicinWorker: any = new Worker(
  "medicin-queue",

  async (job: any) => {
    const { patientId, phone } = job.data;

    if (phone) {
      await client.calls.create({
        to: "+91" + phone,

        from: process.env.TWILIO_NUMBER,

        twiml: `
    <Response>
      <Play>
        https://hosta.t3.tigrisfiles.io/eb29ab10-669e-41cb-a99b-b3a398ae5c6c-audio.mp3
      </Play>
    </Response>
  `,
      });
    }
  },

  { connection },
);

medicinWorker.on("completed", (job: any) => {
  console.log("Job completed:", job.id);
});

medicinWorker.on("failed", (job: any, err: any) => {
  console.error("Job failed:", err);
});

export default medicinWorker;
