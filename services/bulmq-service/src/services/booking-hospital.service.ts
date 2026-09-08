import { bookingQueue  } from "../queues/booking-remainder-hospital.queue";




export const scheduleBookingHospital = async ({

  subject,
  doctorId,
  hospitalId,
  body,
  sendAt,
  
}) => {
  try {
    const sendAtTime = new Date(sendAt).getTime();
    const now = Date.now();

    const delay = sendAtTime - now;

    const job = await bookingQueue.add(
      "send-booking-hosptital",
      {
     
        subject,
        body,
        doctorId,
      hospitalId
     
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

    return job;
  } catch (error) {
    throw error;
  }
};



