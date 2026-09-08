import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Medicinremainder from "../models/medicinremainder.model";
import { publishEvent } from "../events/publisher";
import axios from "axios";
import dotevn from "dotenv";
import { Op } from "sequelize";
dotevn.config();


// REGISTER - POST /medicinremainder/register

export const Registeration: any = asyncHandler(
  async (req: any, res: any) => {
    const {
      medicineName,
      dosage,
      days,
      timeSlots,
      startDate,
      endDate,
      userId: bodyUserId,
    } = req.body;

    // =========================
    // SAFE USER ID HANDLING
    // =========================
    const userId = req.user?.id || bodyUserId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID missing (unauthorized request)",
      });
    }


    try {
      await axios.get(
        `${process.env.USER_SERVICE_URL}/users/${userId}`,
        {
          timeout: 5000,
          headers: {
            Authorization: req.headers.authorization,
          },
        }
      );
    } catch (error: any) {
      console.error(
        "User service error:",
        error?.message || error
      );

      return res.status(400).json({
        success: false,
        message:
          "User service unavailable or user does not exist",
      });
    }


    const newMedicinremainder =
      await Medicinremainder.create({
        userId,
        medicineName,
        dosage,
        days,
        timeSlots,
        startDate,
        endDate,
      });

    // =========================
    // EVENT PUBLISH (NON-BLOCKING SAFE)
    // =========================
    try {
      await publishEvent(
        "medicinremainder_events",
        "MEDICINREMAINDER_REGISTERED",
        {
          MedicinremainderId: newMedicinremainder.id,
          userId: newMedicinremainder.userId,
        }
      );
    } catch (err) {
      console.error("Event publish failed:", err);
    }


    try {
      await axios.post(
        `${process.env.BULMQ_SERVICE_URL}/medicin-task`,
        {
          userId,
          medicineName,
          dosage,
          days,
          timeSlots,
          startDate,
          endDate,
          message: "This is your medicine reminder time",
        },
        {
          timeout: 5000,
          headers: {
            Authorization: req.headers.authorization,
          },
        }
      );
    } catch (err) {
      console.error(
        "BULMQ service failed:",
        err?.message || err
      );
    }

    return res.status(201).json({
      success: true,
      message:
        "Medicine reminder registered successfully",
      data: newMedicinremainder,
      error: null,
    });
  }
);


// GET ONE - GET /medicinremainder/:id
export const getanMedicinremainder: any = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.id;
  const medicinremainder = await Medicinremainder.findOne({
    where: { id: req.params.id, userId },
  });

  if (!medicinremainder) {
    res.status(404).json({
      success: false,
      message: "Medicine reminder not found or unauthorized",
      data: null,
      error: { code: "MEDICINREMAINDER_NOT_FOUND" },
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Medicine reminder fetched successfully",
    data: medicinremainder,
    error: null,
  });
});

// UPDATE - PUT /medicinremainder/:id
export const updateData: any = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  const updatePayload = req.body;

  // Remove userId from payload to prevent ownership hijacking
  delete updatePayload.userId;

  const medicinremainder = await Medicinremainder.update(updatePayload, {
    where: { id, userId },
    returning: true,
  });

  if (!medicinremainder[1] || medicinremainder[1].length === 0) {
    res.status(404).json({
      success: false,
      message: "Medicine reminder not found or unauthorized",
      data: null,
      error: { code: "MEDICINREMAINDER_NOT_FOUND" },
    });
    return;
  }

  await publishEvent("medicinremainder_events", "MEDICINREMAINDER_UPDATED", {
    id: medicinremainder[1][0].id,
  });

  res.status(200).json({
    success: true,
    message: "Medicine reminder updated successfully",
    data: medicinremainder[1][0],
    error: null,
  });
});

// DELETE - DELETE /medicinremainder/:id
export const medicinremainderDelete: any = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;

  const record = await Medicinremainder.findOne({ where: { id, userId } });
  if (!record) {
    res.status(404).json({
      success: false,
      message: "Medicine reminder not found or unauthorized",
      data: null,
      error: { code: "MEDICINREMAINDER_NOT_FOUND" },
    });
    return;
  }

  await Medicinremainder.destroy({ where: { id, userId } });

  res.status(200).json({
    success: true,
    message: "Medicine reminder deleted successfully",
    data: null,
    error: null,
  });
});

// GET ALL - GET /medicinremainder
export const getMedicinremainder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  let { userId, medicineName, search_query }: any = req.query;

  // Normalize arrays
  const extract = (val: any) => (Array.isArray(val) ? val[0] : val);

  userId = extract(userId);
  medicineName = extract(medicineName);
  search_query = extract(search_query);

  const whereClause: any = {};

  // FIXED: correct field mapping
  if (medicineName) {
    whereClause.medicineName = {
      [Op.iLike]: `%${medicineName}%`,
    };
  }

  if (userId !== undefined) {
    whereClause.userId = Number(userId);
  }

  // Global search
  if (search_query) {
    whereClause[Op.or] = [
      {
        medicineName: {
          [Op.iLike]: `%${search_query}%`,
        },
      },
    ];
  }

  const medicinremainder = await Medicinremainder.findAll({
    where: whereClause,
    order: [["createdAt", "DESC"]],
  });

  if (medicinremainder.length === 0) {
   res.status(404).json({
      success: false,
      message: "No data found",
      data: [],
      error: { code: "NO_DATA_FOUND", details: null },
    });
     return ;
  }

  res.status(200).json({
    success: true,
    data: medicinremainder,
    error: null,
  });
   return ;
});
