import {connection }from "../config/redis";
import dotenv from "dotenv";
import twilio from "twilio";
import { Worker } from "bullmq";

dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);




export const bookingWorkerHospital: any = new Worker(
  "booking-queue-hospital",

  async (job) => {
    const {  doctorId, hospitalId, body } = job.data;
   
      await client.messages.create({
        to: "+91" + "8590062623",
        from: process.env.TWLIO_NUMBER,
        body
      });
    },
  

  { connection },
);




bookingWorkerHospital.on("completed", (job) => {
  console.log("Job completed:", job.id);
});

bookingWorkerHospital.on("failed", (job, err) => {
  console.error("Job failed:", err);
});



