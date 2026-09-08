import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { scheduleBlacklistReminderHospital } from "../services/blacklist-hospital.service";

export const assignBlacklistReminderHospital: any =
  asyncHandler(async (req: Request, res: Response) => {

    try {

      const {
        hospitalId,
        hospitalName,
        phone,
        blacklistDate,
      } = req.body;

      const job =
        await scheduleBlacklistReminderHospital({
          hospitalId,
          hospitalName,
          phone,
          blacklistDate,
        });

      res.status(200).json({
        success: true,
        jobId: job.id,
      });

    } catch (error: any) {

      res.status(500).json({
        success: false,
        message: error.message,
      });

    }

  });