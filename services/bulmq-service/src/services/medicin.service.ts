import { medicinQueue } from "../queues/medicin-remainder.queue";



async function scheduleMedicin({
  phone,
  subject,
  body,
  sendAt,
}) {
  try {

    const delay =
      new Date(sendAt).getTime() - Date.now();

    if (delay < 0) {
      throw new Error("Send time must be future");
    }

    const job = await medicinQueue.add(
      "send-medicin",
      {
        phone,
        subject,
        body,
      },
      {
        delay,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: true,
      }
    );

    return job;

  } catch (error) {
    throw error;
  }
}



export default scheduleMedicin;