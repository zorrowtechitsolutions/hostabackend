import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { scheduleAutoDecline, cancelAutoDecline } from "../services/booking-auto-decline.service";

// Schedule an auto-decline job
export const assignAutoDecline: any = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { bookingId, delayMinutes } = req.body;

    if (!bookingId || !delayMinutes || delayMinutes <= 0) {
      res.status(400).json({
        success: false,
        message: "bookingId and delayMinutes (> 0) are required",
      });
      return;
    }

    const job = await scheduleAutoDecline({ bookingId, delayMinutes });

    res.json({
      success: true,
      jobId: job.id,
      message: `Auto-decline scheduled for booking ${bookingId} in ${delayMinutes} minutes`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Cancel an auto-decline job (called when booking is accepted/cancelled manually)
export const removeAutoDecline: any = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      res.status(400).json({
        success: false,
        message: "bookingId is required",
      });
      return;
    }

    await cancelAutoDecline(bookingId);

    res.json({
      success: true,
      message: `Auto-decline cancelled for booking ${bookingId}`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
