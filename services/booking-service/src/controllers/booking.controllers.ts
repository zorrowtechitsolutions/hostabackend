import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Booking from "../models/booking.model";
import { publishEvent } from "../events/publisher";
import { httpClient } from "../utils/httpClient";
import axios from "axios";
import dotenv from "dotenv"
import { Op, QueryTypes, Sequelize, Transaction } from "sequelize";
import sequelize from "../config/db";
dotenv.config();


// const [lastBooking]: any =
//   await Booking.sequelize!.query(
//     `
//     SELECT COALESCE(MAX("bookingNumber"), 0) AS "maxNum"
//     FROM "bookings"
//     WHERE "hospitalId" = :hospitalId
//     `,
//     {
//       replacements: { hospitalId },
//       type: QueryTypes.SELECT,
//     }
//   );

// const bookingNumber =
//   Number(lastBooking?.maxNum || 0) + 1;
// REGISTER - POST /booking/register
export const Registeration: any = asyncHandler(
  async (req: any, res: Response): Promise<void> => {
    const {
      patient_dob,
      patient_age,
      patient_gender,
      patient_name,
      patient_place,
      patient_phone,
      userId,
      patientId,
      hospitalId,
      doctorId,
      department,
      displayName,
      booking_date,
      consulting_time,
      booking_status,
      status,
      token,
      hospitalName,


    } = req.body;

    const errors: string[] = [];

    // ==============================
    // 2. VALIDATE USER
    // ==============================
    // Only validate user if userId is provided (staff bookings may not have userId)
    if (userId) {
      try {
        await httpClient.get(
          `${process.env.USER_SERVICE_URL}/internal/users/${userId}`,
          { headers: { Authorization: req.headers.authorization } }
        );
      } catch (error: any) {
        console.error("User validation failed:", error.message);
        errors.push("User not found");
      }
    }

    // ==============================
    // 3. VALIDATE HOSPITAL
    // ==============================
    let hospitalRes: any;
    try {
      hospitalRes = await httpClient.get(
        `${process.env.HOSPITAL_SERVICE_URL}/hospital/${hospitalId}`,
        { headers: { Authorization: req.headers.authorization } }
      );
    } catch {
      errors.push("Hospital not found");
    }

    // ==============================
    // 4. VALIDATE DOCTOR (FIXED)
    // ==============================
    let doctor: any;

    try {
      const doctorRes = await httpClient.get(
        `${process.env.DOCTOR_SERVICE_URL}/doctor/${doctorId}`,
        { headers: { Authorization: req.headers.authorization } }
      );

      // IMPORTANT FIX: correct axios structure
      doctor = doctorRes.data;
    } catch {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    // ==============================
    // 5. STOP IF ERRORS EXIST
    // ==============================
    if (errors.length > 0) {
      res.status(404).json({
        success: false,
        message: "Validation failed",
        errors,
      });
      return;
    }

    if (doctor?.data?.bookingOpen === false) {
      res.status(400).json({
        success: false,
        message: "Booking is currently closed for this doctor.",
      });
      return;
    }

    // ==============================
    // 5.5. MANUAL COUNT LIMIT CHECK & 6. CREATE BOOKING
    // ==============================
    const manualCountLimit = doctor?.data?.appointmentCount;
    let newbooking: any;

    try {
      // await sequelize.transaction(
      //   { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
      //   async (t) => {
      //     if (manualCountLimit && manualCountLimit > 0) {
      //       const startOfDay = new Date(booking_date);
      //       startOfDay.setHours(0, 0, 0, 0);
      //       const endOfDay = new Date(booking_date);
      //       endOfDay.setHours(23, 59, 59, 999);

      //       const currentBookingsCount = await Booking.count({
      //         where: {
      //           doctorId,
      //           booking_date: {
      //             [Op.between]: [startOfDay, endOfDay],
      //           },
      //           status: {
      //             [Op.notIn]: ['cancel', 'declined'],
      //           },
      //         },
      //         transaction: t,
      //       });

      //       if (currentBookingsCount >= manualCountLimit) {
      //         throw new Error("BOOKING_LIMIT_REACHED");
      //       }
      //     }

      //     newbooking = await Booking.create(
      //       {
      //         patient_dob,
      //         patient_age,
      //         patient_gender,
      //         patient_name,
      //         patient_place,
      //         patient_phone,
      //         userId,
      //         patientId,
      //         hospitalId,
      //         doctorId,
      //         booking_date,
      //         doctor_name: displayName,
      //         doctor_department: department,
      //         consulting_time,
      //         booking_status: booking_status || "user booking",
      //         status,
      //         token,
      //         hospitalName,
      //       },
      //       { transaction: t }
      //     );
      //   }
      // );
      await sequelize.transaction(
  {
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  },
  async (t) => {
    if (manualCountLimit && manualCountLimit > 0) {
      const startOfDay = new Date(booking_date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(booking_date);
      endOfDay.setHours(23, 59, 59, 999);

      const todayBookingAcceptCount = await Booking.count({
        where: {
          doctorId,
          booking_date: {
            [Op.between]: [startOfDay, endOfDay],
          },
          status: "accepted",
        },
        transaction: t,
      });

      if (todayBookingAcceptCount >= manualCountLimit) {
        throw new Error("BOOKING_LIMIT_REACHED");
      }
    }

    // ==========================================
    // Generate hospital-wise booking number
    // ==========================================

    const [lastBooking]: any =
      await Booking.sequelize!.query(
        `
        SELECT COALESCE(MAX("bookingNumber"), 0) AS "maxNum"
        FROM "bookings"
        WHERE "hospitalId" = :hospitalId
        `,
        {
          replacements: {
            hospitalId,
          },
          type: QueryTypes.SELECT,
          transaction: t,
        }
      );

    const bookingNumber =
      Number(lastBooking?.maxNum || 0) + 1;

    // ==========================================
    // Create booking
    // ==========================================

    newbooking = await Booking.create(
      {
        patient_dob,
        patient_age,
        patient_gender,
        patient_name,
        patient_place,
        patient_phone,
        userId,
        patientId,

        hospitalId,
        doctorId,

        bookingNumber,

        booking_date,

        doctor_name: displayName,
        doctor_department: department,

        consulting_time,

        booking_status:
          booking_status || "user booking",

        status,
        token,
        hospitalName,
      },
      {
        transaction: t,
      }
    );
  }
);
    } catch (error: any) {
      if (error.message === "BOOKING_LIMIT_REACHED") {
        const doctorName = doctor?.data?.displayName || "the doctor";
        const hospitalsName = hospitalRes?.data?.data?.name || "the hospital";
        const limitMsg = `Your booking with ${doctorName} at ${hospitalsName} on ${booking_date} could not be placed. The doctor has reached the maximum limit of ${manualCountLimit} appointments for this day. Please try another date.`;

        try {
          await publishEvent("booking_events", "BOOKING_LIMIT_REACHED", {
            userId,
            hospitalId,
            doctorId,
            doctorName,
            hospitalName: hospitalsName,
            booking_date,
            manualCountLimit,
            message: limitMsg,
          });
        } catch (err: any) {
          console.error("Failed to publish BOOKING_LIMIT_REACHED event:", err.message);
        }

        res.status(400).json({
          success: false,
          message: `Booking limit reached. This doctor only accepts ${manualCountLimit} bookings per day.`,
        });
        return;
      }

      console.error("Transaction Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process booking due to concurrent requests. Please try again.",
      });
      return;
    }

    // ==============================
    // 7. SAFE EXTERNAL CALLS
    // ==============================

    const doctorName =
      doctor?.data?.displayName || "Unknown Doctor";
    const hospitalsName =
      hospitalRes?.data?.data?.name || `Hospital (ID: ${hospitalId})`;

    await Promise.allSettled([
      // Notification Service
      httpClient.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/notification`,
        {
          hospitalIds: hospitalId ? [Number(hospitalId)] : [],
          doctorIds: doctorId ? [Number(doctorId)] : [],
          message: `New booking for  ${doctorName} on ${booking_date}`,
        },
        { headers: { Authorization: req.headers.authorization } }
      ),

      // BullMQ Service
      axios.post(
        `${process.env.BULMQ_SERVICE_URL}/booking-task/hospital`,
        {
          doctorId,
          hospitalId,
          message: `New booking for  ${doctorName} on ${booking_date}`,
        },
        { headers: { Authorization: req.headers.authorization } }
      ),
    ]);

    // ==============================
    // 8. EVENT PUBLISH
    // ==============================
    await publishEvent("booking_events", "BOOKING_REGISTERED", {
      bookingId: newbooking.id,
      userId,
      hospitalId,
      doctorId,
      patient_name,
      doctorName,
      hospitalName: hospitalsName,
      booking_date,
    });

    // ==============================
    // 8.5 AUTO-DECLINE SCHEDULING
    // ==============================
    const autoDeclineMinutes = doctor?.data?.autoDecline;
    if (autoDeclineMinutes && autoDeclineMinutes > 0 && newbooking.status === 'pending') {
      try {
        await axios.post(
          `${process.env.BULMQ_SERVICE_URL}/booking-task/auto-decline`,
          {
            bookingId: newbooking.id,
            delayMinutes: autoDeclineMinutes
          },
          { headers: { Authorization: req.headers.authorization } }
        );
        console.log(`Scheduled auto-decline for booking ${newbooking.id} in ${autoDeclineMinutes}m`);
      } catch (err: any) {
        console.error("Failed to schedule auto decline:", err.message);
      }
    }


    // Push notifications are now completely handled asynchronously via the BOOKING_REGISTERED event in notification-service

    // ==============================
    // 9. RESPONSE
    // ==============================
    res.status(201).json({
      success: true,
      message: "Registration completed",
      data: newbooking,
    });

    return;
  }
);

// GET ONE - GET /booking/:id
export const getanBooking: any = asyncHandler(
  async (req: Request, res: Response) => {
    const booking = await Booking.findOne({ where: { bookingNumber: req.params.id } });
    if (!booking) {
      res.status(404).json({
        success: false,
        message: "booking not found",
        data: null,
        error: { code: "BOOKING_NOT_FOUND", details: null },
      });
      return;
    }

    res.status(200).json({
      success: true,
      status: "Success",
      data: booking,
      error: null,
    });
  },
);

// UPDATE - PUT /booking/:id
export const updateData: any = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updatePayload = req.body;
      if (req.body.declineReason && !req.body.reason) {
        updatePayload.reason = req.body.declineReason;
      }

      // Fetch old booking to detect token changes
      const oldBooking = await Booking.findOne({ where: { bookingNumber: id } });
      if (!oldBooking) {
        res.status(404).json({
          success: false,
          message: "booking not found",
          status: 404,
          data: null,
          error: { code: "BOOKING_NOT_FOUND", details: `No booking exists with ID ${id}` },
        });
        return;
      }
      const oldToken = oldBooking.token;

      if (updatePayload.status === "accepted" && oldBooking.status !== "accepted") {
        try {
          const doctorRes = await httpClient.get(
            `${process.env.DOCTOR_SERVICE_URL}/doctor/${oldBooking.doctorId}`,
            { headers: { Authorization: req.headers.authorization } },
          );
          const doctorData = doctorRes.data?.data;
          const appointmentCount = Number(doctorData?.appointmentCount || 0);
          const acceptedToday = Number(doctorData?.todayBookingAcceptCount || 0);

          if (appointmentCount > 0 && acceptedToday >= appointmentCount) {
            res.status(400).json({
              success: false,
              message: `Booking limit reached. This doctor only accepts ${appointmentCount} bookings per day.`,
            });
            return;
          }
        } catch (error: any) {
          console.error("Failed to validate doctor booking limit:", error.message);
        }
      }

      let updatedBooking;

      // Handle token assignment concurrency-safely if accepting without a token
      if (updatePayload.status === 'accepted' && !oldToken) {
        await sequelize.transaction(
          {
            isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
          },
          async (t) => {
            const startOfDay = new Date(oldBooking.booking_date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(oldBooking.booking_date);
            endOfDay.setHours(23, 59, 59, 999);

            const [lastBooking]: any = await Booking.sequelize!.query(
              `
              SELECT COALESCE(MAX("token"), 0) AS "maxToken"
              FROM "bookings"
              WHERE "doctorId" = :doctorId 
                AND "hospitalId" = :hospitalId
                AND "booking_date" BETWEEN :startOfDay AND :endOfDay
                AND "status" NOT IN ('cancel', 'declined')
              `,
              {
                replacements: { 
                  doctorId: oldBooking.doctorId,
                  hospitalId: oldBooking.hospitalId,
                  startOfDay,
                  endOfDay
                },
                type: QueryTypes.SELECT,
                transaction: t,
              }
            );

            const newToken = Number(lastBooking?.maxToken || 0) + 1;
            updatePayload.token = newToken;

            const booking = await Booking.update(updatePayload, {
              where: { bookingNumber: id },
              returning: true,
              transaction: t,
            });
            updatedBooking = booking[1][0];
          }
        );
      } else {
        const booking = await Booking.update(updatePayload, {
          where: { bookingNumber: id },
          returning: true,
        });
        
        if (booking[1] && booking[1].length > 0) {
          updatedBooking = booking[1][0];
        }
      }

      if (!updatedBooking) {
        res.status(404).json({
          success: false,
          message: "booking not found",
          status: 404,
          data: null,
          error: { code: "BOOKING_NOT_FOUND", details: `No booking exists with ID ${id}` },
        });
        return;
      }

      // ✅ Detect changes
      const statusChanged = oldBooking.status !== updatedBooking.status;
      const tokenChanged = updatePayload.token !== undefined && oldToken != null && oldToken !== updatedBooking.token;

      if (statusChanged || tokenChanged) {
        let eventName: "BOOKING_UPDATED" | "BOOKING_CANCELLED" | "BOOKING_ACCEPTED" | "BOOKING_COMPLETED" = "BOOKING_UPDATED";

        if (statusChanged) {
          if (updatedBooking.status === "cancel") {
            eventName = "BOOKING_CANCELLED";
          } else if (updatedBooking.status === "accepted") {
            eventName = "BOOKING_ACCEPTED";
          } else if (updatedBooking.status === "completed") {
            eventName = "BOOKING_COMPLETED";
          }
        }

        // ✅ Fetch doctor and hospital names for notification
        let doctorName = "";
        let hospitalName = "";
        try {
          const doctorRes = await httpClient.get(
            `${process.env.DOCTOR_SERVICE_URL}/doctor/${updatedBooking.doctorId}`,
            { headers: { Authorization: req.headers.authorization } },
          );
          doctorName = doctorRes.data?.data?.displayName || "";
        } catch (err: any) {
          console.error("⚠️ Failed to fetch doctor name for event payload:", err.message);
        }
        try {
          const hospitalRes = await httpClient.get(
            `${process.env.HOSPITAL_SERVICE_URL}/hospital/${updatedBooking.hospitalId}`,
            { headers: { Authorization: req.headers.authorization } },
          );
          hospitalName = hospitalRes.data?.data?.name || "";
        } catch (err: any) {
          console.error("⚠️ Failed to fetch hospital name for event payload:", err.message);
        }

        const actionBy = req.body.actionBy || req.body.declinedBy || (req as any).user?.role || (req as any).user?.type || undefined;
        const reason = req.body.reason || req.body.declineReason || undefined;

        const eventPayload = {
          bookingId: updatedBooking.id,
          userId: updatedBooking.userId,
          hospitalId: updatedBooking.hospitalId,
          doctorId: updatedBooking.doctorId,
          patient_name: updatedBooking.patient_name,
          booking_date: updatedBooking.booking_date,
          status: updatedBooking.status,
          statusChanged: statusChanged,
          tokenChanged: tokenChanged,
          oldToken: oldToken,
          newToken: updatedBooking.token,
          doctorName: doctorName,
          hospitalName: hospitalName,
          reason: reason,
          actionBy: actionBy,
        };

        console.log("🔥 SENDING BOOKING SOCKET EVENT:", {
          eventName,
          bookingId: eventPayload.bookingId,
          hospitalId: eventPayload.hospitalId,
          doctorId: eventPayload.doctorId,
          userId: eventPayload.userId,
          status: eventPayload.status,
        });

        await publishEvent("booking_events", eventName, eventPayload);

        // ✅ Only trigger the reminder and generic direct notification if status actually changed
        if (statusChanged && updatedBooking.status !== "cancel") {
          try {
            // ✅ Use correct values
            await axios.post(
              `${process.env.BULMQ_SERVICE_URL}/booking-task/users`,
              {
                patient_phone: updatedBooking?.patient_phone,
                doctorId: updatedBooking?.doctorId,
                status: updatedBooking?.status,
                consulting_time: updatedBooking?.consulting_time,
                message: `Booking ${updatedBooking?.status}`,
              },
              {
                headers: { Authorization: req.headers.authorization },
              },
            );
          } catch (bulmqError: any) {
            console.error("⚠️ Failed to trigger BullMQ reminder service:", bulmqError.message);
          }

        }
      }



      res.status(200).json({
        success: true,
        message: "successfully updated",
        status: 200,
        data: updatedBooking,
        error: null,
      });

    } catch (error: any) {
      console.error("🔥 Error in booking update controller:", error);
      res.status(error.response?.status || 500).json({
        success: false,
        message: error.message || "An unexpected error occurred during update",
        status: error.response?.status || 500,
        data: null,
        error: {
          code: "UPDATE_ERROR",
          details: error.response?.data || error.stack || null,
        },
      });
    }
  },
);

// DELETE - DELETE /booking/:id
export const bookingDelete: any = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const staff = await Booking.findOne({ where: { bookingNumber: id } });
    if (!staff) {
      res.status(404).json({
        success: false,
        message: "booking not found",
        data: null,
        error: { code: "BOOKING_NOT_FOUND", details: null },
      });
      return;
    }

    await Booking.destroy({
      where: { bookingNumber: id },
    });

    await publishEvent("booking_events", "BOOKING_DELETED", {
      bookingId: staff.id,
      userId: staff.userId,
      hospitalId: staff.hospitalId,
      doctorId: staff.doctorId,
    });

    res.status(200).json({
      success: true,
      message: "Your account deleted successfully",
      status: 200,
      data: null,
      error: null,
    });
  },
);

// GET ALL - GET /booking

export const getBookings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  let {
    userId,
    hospitalId,
    doctorId,
    department,
    phone,
    status,
    doctor_name,
    patient_name,
    gender,
    startDate,
    endDate,
    date,
    page = 1,
    limit = 10,
    search_query,
  }: any = req.query;

  // Normalize arrays
  const extract = (val: any) => (Array.isArray(val) ? val[0] : val);

  userId = extract(userId);
  hospitalId = extract(hospitalId);
  doctorId = extract(doctorId);
  department = extract(department);
  phone = extract(phone);
  status = extract(status);
  doctor_name = extract(doctor_name);
  page = extract(page);
  limit = extract(limit);
  search_query = extract(search_query);
  patient_name = extract(patient_name);
  gender = extract(gender);
  startDate = extract(startDate);
  endDate = extract(endDate);
  date = extract(date);

  const pageNum = Number(page);
  const limitNum = Number(limit);

  const whereClause: any = {};

  // Filters
  if (userId !== undefined) {
    whereClause.userId = Number(userId);
  }

  if (hospitalId !== undefined) {
    whereClause.hospitalId = Number(hospitalId);
  }

  if (doctorId !== undefined) {
    whereClause.doctorId = Number(doctorId);
  }

  if (department) {
    whereClause.doctor_department = {
      [Op.iLike]: `%${department}%`,
    };
  }

  if (gender) {
    whereClause.patient_gender = {
      [Op.iLike]: `%${gender}%`,
    };
  }


  if (phone) {
    whereClause.patient_phone = {
      [Op.iLike]: `%${phone}%`,
    };
  }

  if (status) {
    whereClause.status = status;
  }

  if (doctor_name) {
    whereClause.doctor_name = {
      [Op.iLike]: `%${doctor_name}%`,
    };
  }

  if (patient_name) {
    whereClause.patient_name = {
      [Op.iLike]: `%${patient_name}%`,
    };
  }

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    whereClause.booking_date = {
      [Op.between]: [start, end],
    };
  } else if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    whereClause.booking_date = {
      [Op.between]: [start, end],
    };
  }


  // Global search
  if (search_query?.trim()) {
    const search = search_query.trim();

    whereClause[Op.or] = [
      Sequelize.where(
        Sequelize.fn("COALESCE", Sequelize.col("doctor_name"), ""),
        {
          [Op.iLike]: `%${search}%`,
        }
      ),

      Sequelize.where(
        Sequelize.fn("COALESCE", Sequelize.col("doctor_department"), ""),
        {
          [Op.iLike]: `%${search}%`,
        }
      ),

      Sequelize.where(
        Sequelize.fn("COALESCE", Sequelize.col("patient_phone"), ""),
        {
          [Op.iLike]: `%${search}%`,
        }
      ),

      Sequelize.where(
        Sequelize.cast(Sequelize.col("patient_gender"), "TEXT"),
        {
          [Op.iLike]: `%${search}%`,
        }
      ),

      Sequelize.where(
        Sequelize.fn("COALESCE", Sequelize.col("patient_name"), ""),
        {
          [Op.iLike]: `%${search}%`,
        }
      ),
    ];
  }

  // IMPORTANT: pagination query
  const { count, rows } = await Booking.findAndCountAll({
    where: whereClause,
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
    order: [["createdAt", "DESC"]],
  });

  if (count === 0) {
    res.status(404).json({
      success: false,
      message: "No data found",
      data: [],
    });
    return;
  }

  const totalPages = Math.ceil(count / limitNum);

  res.status(200).json({
    success: true,
    data: rows,
    pagination: {
      totalItems: count,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPreviousPage: pageNum > 1,
    },
  });
  return;
});

// INTERNAL API - PUT /booking/internal/:id/auto-decline
export const autoDeclineBooking: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // We are called via internal API, so we can assume authentication if headers have service-secret, 
  // but to be safe we'll just check if booking is still pending.
  const booking = await Booking.findByPk(id);

  if (!booking) {
    res.status(404).json({ success: false, message: "Booking not found" });
    return;
  }

  // If already accepted/cancelled/completed, we don't decline
  if (booking.status !== 'pending') {
    res.status(400).json({ success: false, message: `Booking is already ${booking.status}` });
    return;
  }

  booking.status = 'declined';
  await booking.save();

  // Publish event so notification-service can alert the user
  const eventPayload = {
    bookingId: booking.id,
    userId: booking.userId,
    hospitalId: booking.hospitalId,
    doctorId: booking.doctorId,
    patient_name: booking.patient_name,
    booking_date: booking.booking_date,
    status: booking.status,
    statusChanged: true,
    doctorName: booking.doctor_name || "",
    hospitalName: booking.hospitalName || "",
    actionBy: "doctor",
    autoDeclined: true,
    reason: "Auto-declined due to no response from the doctor within the time limit",
  };

  await publishEvent("booking_events", "BOOKING_UPDATED", eventPayload);

  res.status(200).json({ success: true, message: "Booking auto-declined", data: booking });
});

// GET TODAY BOOKING COUNT FOR A DOCTOR (INTERNAL) - GET /booking/internal/doctor/:doctorId/today-count
export const getTodayCount = asyncHandler(async (req: Request, res: Response) => {
  const { doctorId } = req.params;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const todayBookingAcceptCount = await Booking.count({
    where: {
      doctorId: Number(doctorId),
      booking_date: {
        [Op.between]: [startOfDay, endOfDay],
      },
      status: "accepted",
    },
  });

  res.status(200).json({ todayBookingAcceptCount });
});
