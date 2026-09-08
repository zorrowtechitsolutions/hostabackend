import {connection }from "../config/redis";
import dotenv from "dotenv";
import twilio from "twilio";
import { Worker } from "bullmq";
import axios from "axios";

dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

function formatTimeToSpeech(time: string) {
  const [hour, minute] = time.split(":");

  const h = Number(hour);
  const m = Number(minute);

  const period = h >= 12 ? "PM" : "AM";

  const spokenHour = h % 12 === 0 ? 12 : h % 12;

  return `${spokenHour} ${m} ${period}`;
}

export const bookingWorker: any = new Worker(
  "booking-queue-user",

  async (job) => {
    const { phone, doctorId, status, consulting_time } = job.data;

        console.log(phone, "phone");


    const doctor = await axios.get(
      `${process.env.DOCTOR_SERVICE_API}/doctor/${doctorId}`,
    );

    console.log(phone, "phone");
    

    if (status == "accepted" || status == "declined") {
      const consulting_time_spoken = formatTimeToSpeech(consulting_time);
      await client.calls.create({
        to: "+91" + phone,

        from: process.env.TWILIO_NUMBER,

        twiml: `
<Response>

  <Say voice="Polly.Aditi" language="ml-IN">

    Namaskaram.

    Ningalude Doctor 
    ${doctor?.data?.data?.displayName}
    umayulla booking 

    ${consulting_time_spoken} samayathinu aanu.

    ${
      status === "accepted"
        ? "booking safalamaayi confirm cheythittundu."
        : "booking confirm cheythittilla."
    }

  </Say>

</Response>
`,
      });
    }
  },

  { connection },
);



bookingWorker.on("completed", (job) => {
  console.log("Job completed:", job.id);
});

bookingWorker.on("failed", (job, err) => {
  console.error("Job failed:", err);
});




