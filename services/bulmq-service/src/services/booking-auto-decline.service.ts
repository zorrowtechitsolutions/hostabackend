import { autoDeclineQueue } from "../queues/booking-auto-decline.queue";

export const scheduleAutoDecline = async ({
  bookingId,
  delayMinutes,
}: {
  bookingId: number;
  delayMinutes: number;
}) => {
  try {
    const delayMs = delayMinutes * 60 * 1000;

    const job = await autoDeclineQueue.add(
      "auto-decline-booking",
      {
        bookingId,
      },
      {
        delay: delayMs,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: true,
        // Use bookingId as jobId to prevent duplicate jobs for the same booking
        jobId: `auto-decline-${bookingId}`,
      }
    );

    console.log(`[AUTO-DECLINE] Scheduled decline for booking ${bookingId} in ${delayMinutes} minutes (jobId: ${job.id})`);
    return job;
  } catch (error) {
    console.error("[AUTO-DECLINE] Failed to schedule auto-decline job:", error);
    throw error;
  }
};

// Cancel a scheduled auto-decline job (e.g., when booking is accepted before timeout)
export const cancelAutoDecline = async (bookingId: number) => {
  try {
    const jobId = `auto-decline-${bookingId}`;
    const job = await autoDeclineQueue.getJob(jobId);

    if (job) {
      await job.remove();
      console.log(`[AUTO-DECLINE] Cancelled auto-decline for booking ${bookingId}`);
    }
  } catch (error) {
    console.error("[AUTO-DECLINE] Failed to cancel auto-decline job:", error);
  }
};
