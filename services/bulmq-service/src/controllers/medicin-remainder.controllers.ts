import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { medicinQueue } from "../queues/medicin-remainder.queue";
import axios from "axios";


const generateMedicineDates = (
  days: string[],
  timeSlots: string[],
  startDate: string,
  endDate: string
) => {

  const jobs: Date[] = [];

  const start = new Date(startDate);
  const end = new Date(endDate);

  const daysMap: any = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  while (start <= end) {

    const currentDay = start.getDay();

    for (const day of days) {

      if (currentDay === daysMap[day]) {

        for (const time of timeSlots) {

          const [hour, minute] =
            time.split(":");

          const jobDate = new Date(start);

          jobDate.setHours(Number(hour));
          jobDate.setMinutes(Number(minute));
          jobDate.setSeconds(0);

          if (jobDate > new Date()) {

            jobs.push(jobDate);

          }

        }

      }

    }

    start.setDate(start.getDate() + 1);

  }

  return jobs;

};

export const assignTaskMedicin: any =
asyncHandler(async (req: Request, res: Response) => {

  try {

    const {
      patientId,
      medicineName,
      dosage,
      days,
      timeSlots,
      startDate,
      endDate,
      message,
      phone
    } = req.body;

    let phoneToUse = phone;

    if (!phoneToUse && patientId) {
      try {
        const userResp = await axios.get(`${process.env.USER_SERVICE_API}/users/${patientId}`, {
          headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {}
        });
        phoneToUse = userResp.data?.data?.phone;
      } catch (err) {
        console.error("Failed to fetch user phone", err);
      }
    }

    if (!phoneToUse) {
      res.status(400).json({ success: false, message: "User phone number not found" });
      return;
    }

    // Generate all future schedule dates
    const jobDates =
      generateMedicineDates(
        days,
        timeSlots,
        startDate,
        endDate
      );

    const results = [];

    for (const date of jobDates) {

      const delay =
        date.getTime() - Date.now();

      if (delay > 0) {

        const job =
          await medicinQueue.add(
            "send-medicine-reminder",
            {
              patientId,
              medicineName,
              dosage,
              message,
              phone: phoneToUse,
              scheduleTime: date
            },
            {
              delay,

              jobId:
                `${patientId}-${date.getTime()}`,

              removeOnComplete: true,
            }
          );

        results.push(job.id);

      }

    }

    console.log(
      "Total Jobs Created:",
      results.length
    );

    res.json({
      success: true,
      jobIds: results,
    });

  } catch (error: any) {

    console.error("Task Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

});
