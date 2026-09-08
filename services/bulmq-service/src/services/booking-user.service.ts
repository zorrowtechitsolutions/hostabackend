import { bookingQueue  } from "../queues/booking-remainder-user.queue";


export const scheduleBooking = async ({
  phone,
  subject,
  doctorId,
  status,
  body,
  sendAt,
  consulting_time
}) => {
  try {
    const sendAtTime = new Date(sendAt).getTime();
    const now = Date.now();

    const delay = sendAtTime - now;

    const job = await bookingQueue.add(
      "send-booking-user",
      {
        phone,
        subject,
        body,
        doctorId,
        status,
        consulting_time
      },
      {
        delay: delay > 0 ? delay : 0,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: true,
      }
    );

    console.log(job, "job");
    
    return job;
  } catch (error) {
    throw error;
  }
};




