import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Ambulance from "../models/ambulance.model";
import { publishEvent } from "../events/publisher";
import twilio from "twilio";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { httpClient } from "../utils/httpClient";
import { Op, Sequelize, QueryTypes } from "sequelize";
dotenv.config();

const APPLE_TEST_NUMBER = "9999999999";
const APPLE_TEST_OTP = "123456";

// Helper for Twilio Client
const getTwilioClient = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    return null;
  }
  return twilio(sid, token);
};



// REGISTER - POST /ambulance/register

export const Registeration: any = asyncHandler(async (req: any, res: Response): Promise<void> => {
  const { serviceName, address, phone, vehicleType, userId, hospitalId } = req.body;
  

  // Validate user only if provided
  if (userId) {
    try {
      await httpClient.get(
        `${process.env.USER_SERVICE_URL}/users/${userId}`,
        { headers: { Authorization: req.headers.authorization } }
      );
    } catch (err) {
       res.status(404).json({
        success: false,
        message: `User not found with ID ${userId}`,
        error: { code: "USER_NOT_FOUND" }
      });
      return;
    }
  }

  let hospitalName = "";
  // Validate hospital only if provided
  if (hospitalId) {
    try {
      const hospitalRes = await httpClient.get(
        `${process.env.HOSPITAL_SERVICE_URL}/hospital/${hospitalId}`,
        { headers: { Authorization: req.headers.authorization } }
      );
      hospitalName = hospitalRes.data?.data?.name || hospitalRes.data?.name || "";
    } catch (err) {
       res.status(404).json({
        success: false,
        message: `Hospital not found with ID ${hospitalId}`,
        error: { code: "HOSPITAL_NOT_FOUND" }
      });
      return;
    }
  }

  const exist = await Ambulance.findOne({ where: { phone } });

  
  if (exist) {
     res.status(400).json({
      success: false,
      message: "Ambulance already exists",
      error: { code: "AMBULANCE_ALREADY_EXISTS" },
    });
    return;
  }

  let ambulanceNumber = 1;

if (hospitalId) {
  const [lastResult]: any = await Ambulance.sequelize!.query(
    `
    SELECT COALESCE(MAX("ambulanceNumber"), 0) AS "maxNum"
    FROM "ambulances"
    WHERE "hospitalId" = :hospitalId
    `,
    {
      replacements: { hospitalId },
      type: QueryTypes.SELECT,
    }
  );

  ambulanceNumber = Number(lastResult?.maxNum || 0) + 1;
}
  const newAmbulance = await Ambulance.create({
    serviceName,
    address,
    phone,
    vehicleType,
    userId: userId || null,
    hospitalId: hospitalId || null,
      ambulanceNumber,

  });
  

  await publishEvent("ambulance_events", "AMBULANCE_REGISTERED", {
    ambulanceId: newAmbulance?.id,
    ambulanceName: newAmbulance?.serviceName,
    phone: newAmbulance?.phone,
    hospitalId: newAmbulance?.hospitalId,
    hospitalName: hospitalName,
  });



   res.status(201).json({
    success: true,
    message: "Registration completed successfully",
    data: newAmbulance.toJSON(),
    error: null,
  });
  return;
});


// LOGIN WITH PHONE (OTP REQUEST) - POST /ambulance/login/phone
export const loginWithPhone: any = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body;
  let numericPhone = phone.replace(/\D/g, "").slice(-10);

  if (!numericPhone) {
    res.status(400).json({ success: false, message: "Invalid phone number" });
    return;
  }

  const ambulance = await Ambulance.scope("withPassword").findOne({ where: { phone: numericPhone } });
  if (!ambulance) {
    res.status(404).json({
      success: false,
      message: "Ambulance not found with this phone number",
    });
    return;
  }

  // Generate 6-digit OTP
  const otp = numericPhone === APPLE_TEST_NUMBER 
    ? APPLE_TEST_OTP 
    : Math.floor(100000 + Math.random() * 900000).toString();
  
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry

  await ambulance.update({ otp, otpExpiry });

  // Send OTP via Twilio
  if (numericPhone !== APPLE_TEST_NUMBER) {
    try {
        const client = getTwilioClient();
        const twilioNumber = process.env.TWILIO_NUMBER;

        if (client && twilioNumber) {
            const targetNumber = phone.startsWith("+") ? phone : `+91${numericPhone}`;
            await client.messages.create({
                body: `Your Hosta Ambulance verification code is: ${otp}. Valid for 10 minutes.`,
                from: twilioNumber,
                to: targetNumber,
            });
        }
    } catch (err: any) {
        console.error("Twilio Error:", err.message);
    }
  }

  res.status(200).json({
    success: true,
    message: numericPhone === APPLE_TEST_NUMBER ? "OTP sent (TEST ACCOUNT)" : "OTP sent successfully",
    data: (process.env.NODE_ENV === "development" || numericPhone === APPLE_TEST_NUMBER) ? { otp } : null,
  });
});

// VERIFY OTP - POST /ambulance/otp
export const verifyOtp: any = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  let numericPhone = phone.replace(/\D/g, "").slice(-10);

  const ambulance = await Ambulance.scope("withPassword").findOne({ where: { phone: numericPhone } });

  if (!ambulance || ambulance.otp !== otp || (ambulance.otpExpiry && new Date() > ambulance.otpExpiry)) {
    res.status(400).json({
      success: false,
      message: "Invalid or expired OTP",
    });
    return;
  }

  // Clear OTP fields after verification
  await ambulance.update({ otp: null as any, otpExpiry: null as any });

  const jwtKey = process.env.JWT_SECRET || "supersecretjwtkey";
  const token = jwt.sign({ id: ambulance.id, name: ambulance.serviceName, role: "ambulance" }, jwtKey, {
    expiresIn: "1d"
  });

  const ambulanceJson = ambulance.toJSON();
  
  delete (ambulanceJson as any).otp;
  delete (ambulanceJson as any).otpExpiry;

  res.status(200).json({
    success: true,
    message: "OTP verified successfully",
    token,
    data: ambulanceJson,
  });
});

// GET ONE - GET /ambulance/:id
export const getanAmbulace: any = asyncHandler(async (req: Request, res: Response) => {
  const user = await Ambulance.findByPk(req.params.id);
  if (!user) {
    res.status(404).json({
      success: false,
      message: "Ambulance not found",
      data: null,
      error: { code: "AMBULANCE_NOT_FOUND", details: null },
    });
    return;
  }

  const safeUser = user.toJSON();

  res.status(200).json({
    success: true,
    status: "Success",
    data: safeUser,
    error: null,
  });
});

// UPDATE - PUT /ambulance/:id
export const updateData: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Whitelist fields to prevent Mass Assignment
  const { serviceName, address, phone, vehicleType } = req.body;
  const updatePayload = { serviceName, address, phone, vehicleType };

  const [affectedCount, affectedRows] = await Ambulance.update(updatePayload, {
    where: { id: id },
    returning: true,
  });

  if (affectedCount === 0) {
    res.status(404).json({
      success: false,
      message: "Ambulance not found",
      data: null,
      error: { code: "AMBULANCE_NOT_FOUND", details: null },
    });
    return;
  }

  const updatedAmbulance = affectedRows[0].toJSON();

  let hospitalName = "";
  if (updatedAmbulance.hospitalId) {
    try {
      const hospitalRes = await httpClient.get(
        `${process.env.HOSPITAL_SERVICE_URL}/hospital/${updatedAmbulance.hospitalId}`,
        { headers: { Authorization: req.headers.authorization } }
      );
      hospitalName = hospitalRes.data?.data?.name || hospitalRes.data?.name || "";
    } catch (err) {}
  }

  await publishEvent("ambulance_events", "AMBULANCE_UPDATED", {
    ambulanceId: updatedAmbulance.id,
    ambulanceName: updatedAmbulance.serviceName,
    hospitalId: updatedAmbulance.hospitalId,
    hospitalName: hospitalName,
  });

  res.status(200).json({
    success: true,
    message: "successfully updated",
    data: updatedAmbulance,
    error: null,
  });
});

// DELETE - DELETE /ambulance/:id
export const ambulanceDelete: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const ambulance = await Ambulance.findByPk(id);
  if (!ambulance) {
    res.status(404).json({
      success: false,
      message: "Ambulance not found",
      data: null,
      error: { code: "AMBULANCE_NOT_FOUND", details: null },
    });
    return;
  }

  await Ambulance.destroy({
    where: { id: id }
  });

  let hospitalName = "";
  if (ambulance.hospitalId) {
    try {
      const hospitalRes = await httpClient.get(
        `${process.env.HOSPITAL_SERVICE_URL}/hospital/${ambulance.hospitalId}`,
        { headers: { Authorization: req.headers.authorization } }
      );
      hospitalName = hospitalRes.data?.data?.name || hospitalRes.data?.name || "";
    } catch (err) {}
  }

  await publishEvent("ambulance_events", "AMBULANCE_DELETED", {
    ambulanceId: id,
    ambulanceName: ambulance.serviceName,
    hospitalId: ambulance.hospitalId,
    hospitalName: hospitalName,
  });

  res.status(200).json({
    success: true,
    message: "Your account deleted successfully",
    data: [],
    error: null,
  });
});

// GET ALL - GET /ambulance

export const getAmbulaces = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    let {
      userId,
      hospitalId,
      name,
      country,
      state,
      place,
      district,
      pincode,
      vehicleType,
      search_query,
      limit=10,
      page = 1,
    }: any = req.query;

    // Handle array query params
    if (Array.isArray(userId)) userId = userId[0];
    if (Array.isArray(hospitalId)) hospitalId = hospitalId[0];
    if (Array.isArray(country)) country = country[0];
    if (Array.isArray(state)) state = state[0];
    if (Array.isArray(district)) district = district[0];
    if (Array.isArray(name)) name = name[0];
    if (Array.isArray(place)) place = place[0];
    if (Array.isArray(pincode)) pincode = pincode[0];
    if (Array.isArray(vehicleType)) vehicleType = vehicleType[0];
    if (Array.isArray(search_query)) search_query = search_query[0];
 if (Array.isArray(page)) page = page[0];
 if (Array.isArray(limit)) limit = limit[0];


 

  const pageNum = Number(page);
  const limitNum = Number(limit);



    const where: any = {};

    // Integer filters (safe)
    if (userId && !isNaN(Number(userId))) {
      where.userId = Number(userId);
    }

    if (hospitalId && !isNaN(Number(hospitalId))) {
      where.hospitalId = Number(hospitalId);
    }

    // Name filter
    if (name) {
      where.serviceName = {
        [Op.iLike]: `%${name}%`,
      };
    }

      if (vehicleType) {
      where.vehicleType = {
        [Op.iLike]: `%${vehicleType}%`,
      };
    }

    // JSONB address filters
    const andConditions: any[] = [];

    if (pincode && !isNaN(Number(pincode))) {
      andConditions.push(
        Sequelize.where(
          Sequelize.cast(Sequelize.json("address.pincode"), "text"),
          String(pincode)
        )
      );
    }

    if (place) {
      andConditions.push(
        Sequelize.where(
          Sequelize.cast(Sequelize.json("address.place"), "text"),
          {
            [Op.iLike]: `%${place}%`,
          }
        )
      );
    }

    if (country) {
      andConditions.push(
        Sequelize.where(
          Sequelize.cast(Sequelize.json("address.country"), "text"),
          {
            [Op.iLike]: `%${country}%`,
          }
        )
      );
    }

    if (state) {
      andConditions.push(
        Sequelize.where(
          Sequelize.cast(Sequelize.json("address.state"), "text"),
          {
            [Op.iLike]: `%${state}%`,
          }
        )
      );
    }

    if (district) {
      andConditions.push(
        Sequelize.where(
          Sequelize.cast(Sequelize.json("address.district"), "text"),
          {
            [Op.iLike]: `%${district}%`,
          }
        )
      );
    }

 if (search_query) {
  where[Op.or] = [
    {
      serviceName: {
        [Op.iLike]: `%${search_query}%`,
      },
    },

     {
      vehicleType: {
        [Op.iLike]: `%${search_query}%`,
      },
    },

    Sequelize.literal(
      `address->>'district' ILIKE '%${search_query}%'`
    ),

       Sequelize.literal(
      `address->>'place' ILIKE '%${search_query}%'`
    ),
       Sequelize.literal(
      `address->>'state' ILIKE '%${search_query}%'`
    ),
       Sequelize.literal(
      `address->>'country' ILIKE '%${search_query}%'`
    ),

  ];
}



    // Add AND conditions
    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
    }



      const { count, rows } = await Ambulance.findAndCountAll({
    where,
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
    order: [["createdAt", "DESC"]],
  });


  if (count === 0) {
   res.status(200).json({
      success: false,
      message: "No data found",
      data: [],
    });
    return ;
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



  }
);


