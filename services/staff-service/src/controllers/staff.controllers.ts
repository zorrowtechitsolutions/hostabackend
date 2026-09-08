
import { Request, Response } from "express";
import { Op, QueryTypes, Sequelize, Transaction } from "sequelize";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import twilio from "twilio";
import axios from "axios";
import Staff from "../models/staff.model";
import { publishEvent } from "../events/publisher";
import sequelize from "../config/db";
import { sendEmail } from "../services/mail.service";
import { logger } from "../utils/logger";
import redisClient from "../config/redis";
import dotenv from "dotenv";
dotenv.config();
import StaffHospital from "../models/staffHospital.model";



interface FCMTOKEN {
  deviceId: string;
  fcmToken: string;
  platform: "android" | "ios" | "web";
}



// Helper to set refresh token cookie
const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 14 * 24 * 60 * 60 * 1000, // 2 weeks
    path: "/",
  });
};

const APPLE_TEST_NUMBER = "9999999999";
const APPLE_TEST_OTP = "123456";


export const sendStaffOtpEmail = async (email: string, otp: string, staffName: string) => {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
      <div style="background-color: #28a745; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: 1px;">Hosta Staff</h1>
      </div>
      <div style="padding: 40px; background-color: #ffffff;">
        <h2 style="color: #333; margin-top: 0;">Verification Code</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">Hello <strong>${staffName}</strong>,</p>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">Use the following security code to complete your verification. This code is valid for <strong>10 minutes</strong>.</p>
        
        <div style="text-align: center; margin: 40px 0;">
          <div style="display: inline-block; background-color: #f8f9fa; border: 2px dashed #28a745; border-radius: 8px; padding: 20px 40px; font-size: 32px; font-weight: bold; color: #28a745; letter-spacing: 8px;">
            ${otp}
          </div>
        </div>
        
        <p style="color: #999; font-size: 14px; line-height: 1.5; border-top: 1px solid #eee; pt: 20px;">
          If you didn't request this, please ignore this email or contact support if you have concerns.
        </p>
      </div>
      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #999; font-size: 12px;">
        &copy; 2026 Hosta Health. All rights reserved.
      </div>
    </div>
  `;

  await sendEmail(email, "Your Verification Code - Hosta Staff", html);
};

let twilioClient: any = null;

const getTwilioClient = () => {
  if (twilioClient) return twilioClient;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    logger.warn("Twilio credentials NOT FOUND in environment variables. SMS will NOT be sent.");
    return null;
  }

  try {
    twilioClient = twilio(sid, token);
    return twilioClient;
  } catch (error) {
    logger.error("Failed to initialize Twilio client", error);
    return null;
  }
};

import { httpClient } from "../utils/httpClient";

// REGISTER - POST /staff/register                             
export const Registeration: any = asyncHandler(async (req: any, res: Response) => {
  
  let { hospitalId, name, phone, email, password, roleId,  designation, joiningDate, jobType, staffType,  dob, gender, knowLanguages, qualification, address, hospitalName } = req.body;


  if (!hospitalId) {
    res.status(400).json({ success: false, message: "Hospital ID is required" });
    return;
  }

  // 2. Validate hospitalId via hospital-service
  try {

    const hospitalResponse = await httpClient.get(`${process.env.HOSPITAL_SERVICE_URL}/hospital/${hospitalId}`, {
      headers: { Authorization: req.headers.authorization }
    });
    if (!hospitalResponse.data || !hospitalResponse.data.success) {
      res.status(400).json({ success: false, message: "Invalid hospital ID" });
      return;
    }
    hospitalName = hospitalResponse.data?.data?.name || hospitalName;
  } catch (error) {
    res.status(404).json({
      success: false,
      message: `Hospital with ID ${hospitalId} does not exist in the hospital service.`,
      error: { code: "HOSPITAL_NOT_FOUND" }
    });
    return;
  }

  const phoneExists = await Staff.findOne({ where: { phone, hospitalId } });
  if (phoneExists) {
    res.status(400).json({
      success: false,
      message: "Phone number already registered in this hospital",
      error: { code: "PHONE_EXISTS" },
    });
    return;
  }

  const emailExists = email
    ? await Staff.findOne({ where: { email, hospitalId } })
    : null;
  if (emailExists) {
    res.status(400).json({
      success: false,
      message: "Email already registered in this hospital",
      error: { code: "EMAIL_EXISTS" },
    });
    return;
  }

  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  });
  let newStaff!: Staff;

  try {
    // Generate hospital-scoped staffNumber
    const [lastResult]: any = await Staff.sequelize!.query(
      `
      SELECT COALESCE(MAX("staffNumber"), 0) AS "maxNum"
      FROM "staff"
      WHERE "hospitalId" = :hospitalId
      `,
      {
        replacements: { hospitalId },
        type: QueryTypes.SELECT,
        transaction,
      }
    );

    const staffNumber = Number(lastResult?.maxNum || 0) + 1;

    newStaff = await Staff.create({
      hospitalId, name, phone, email, password, roleId, dob, gender,
      knowLanguages, qualification, address,
      designation, joiningDate, jobType, staffType, hospitalName,
      staffNumber,
      status: 'PENDING',
    }, { transaction });

    await StaffHospital.create({
      staffId: newStaff.id,
      hospitalId: newStaff.hospitalId,
      status: "ACTIVE",
      joinedAt: new Date(),
    }, { transaction });

    await transaction.commit();
  } catch (error: any) {
    await transaction.rollback();
    if (error.name === "SequelizeUniqueConstraintError") {
      res.status(400).json({
        success: false,
        message: "Staff with this phone or email already exists in this hospital",
        error: { code: "BAD_REQUEST", details: error.errors[0].message }
      });
      return;
    } else {
      throw error; // Let global error handler handle other 500s
    }
  }

  // Publish STAFF_CREATED event to RabbitMQ for Auth Service to consume
  await publishEvent("auth_events", "STAFF_CREATED", {
    staffId: newStaff.id,
    email: newStaff.email,
    phone: newStaff.phone,
    password: password, // raw password - Auth Service will hash it via its own beforeCreate hook
    role: "staff",
    roleId: newStaff.roleId,
    staffName: newStaff.name,
    hospitalId: newStaff.hospitalId,
    hospitalName: newStaff.hospitalName,
  });

  await publishEvent("staff_events", "STAFF_REGISTERED", {
    staffId: newStaff.id,
    staffName: newStaff.name,
    phone: newStaff.phone,
    hospitalId: newStaff.hospitalId,
  });

  res.status(201).json({
    success: true,
    message: "Registration completed successfully. Account activation in progress.",
    data: { staffId: newStaff.id, status: newStaff.status },
    error: null,
  });
});

// LOGIN - POST /staff/login
export const login: any = asyncHandler(async (req: Request, res: Response) => {
  const { email, phone, password, fcmToken, hospitalId } = req.body;

  if (!email && !phone) {
    res.status(400).json({
      success: false,
      message: "Please provide either email or phone number",
      error: { code: "IDENTITY_REQUIRED", details: null },
    });
    return;
  }

  const staffs = await Staff.scope("withPassword").findAll({
    where: {
      [Op.and]: [
        {
          [Op.or]: [
            email ? { email } : null,
            phone ? { phone } : null,
          ].filter(Boolean),
        },
        ...(hospitalId ? [{ hospitalId }] : []),
        { isDelete: false },
      ],
    },
  });

  if (!staffs.length) {
    res.status(404).json({
      success: false,
      message: "Staff not found! Please register",
      data: null,
      error: { code: "STAFF_NOT_FOUND", details: null },
    });
    return;
  }

  const matchedStaff = [];

  for (const staff of staffs) {
    const valid = await bcrypt.compare(password, staff.password || "");
    if (valid) {
      matchedStaff.push(staff);
    }
  }

  if (!matchedStaff.length) {
    res.status(401).json({
      success: false,
      message: "Wrong password, Please try again",
      data: null,
      error: { code: "WRONG_PASSWORD", details: null },
    });
    return;
  }

  if (matchedStaff.length > 1 && !hospitalId) {
    res.status(200).json({
      success: true,
      requireHospitalSelection: true,
      hospitals: matchedStaff.map((s) => ({
        staffId: s.id,
        hospitalId: s.hospitalId,
        hospitalName: s.hospitalName,
      })),
    });
    return;
  }

  const staff = matchedStaff[0];

if (fcmToken) {
    const existingTokens: FCMTOKEN[] = Array.isArray(staff.fcmToken)
      ? staff.fcmToken
      : [];

    // Convert single object to array
    const newTokens: FCMTOKEN[] = Array.isArray(fcmToken)
      ? fcmToken
      : [fcmToken];

    const updatedTokens = [
      // Remove old token for same device
      ...existingTokens.filter(
        (oldToken) =>
          !newTokens.some(
            (newToken) =>
              newToken.deviceId === oldToken.deviceId
          )
      ),

      // Add new tokens
      ...newTokens,
    ];

    await staff.update({
      fcmToken: updatedTokens,
    });
}


  const jwtKey = process.env.JWT_SECRET;
  if (!jwtKey) {
    res.status(500).json({
      success: false,
      message: "JWT_SECRET is not defined",
      data: null,
      error: { code: "JWT_SECRET_NOT_DEFINED", details: null },
    });
    return;
  }

  // Generate JWT tokens
  const token = jwt.sign({ id: staff.id, name: staff.name, role: "staff", roleId: staff.roleId, hospitalId: staff.hospitalId, isRefresh: false }, jwtKey, {
    expiresIn: "1d",
  });

  const refreshToken = jwt.sign(
    { id: staff.id, name: staff.name, role: "staff", roleId: staff.roleId, hospitalId: staff.hospitalId, isRefresh: true },
    jwtKey,
    { expiresIn: "2w" }
  );

  // Save refresh token to Redis (REMOVED)

  setRefreshTokenCookie(res, refreshToken);


let authPermission = [];

if (staff.roleId) {
  try {
    const res = await axios.get(
      `${process.env.ROLE_SERVICE_URL}/rolepermission`,
      {
        params: {
          roleId: staff.roleId,
          hospitalId: staff.hospitalId,
        },
      }
    );

    authPermission = res.data;
  } catch (err: any) {
    console.error("Role service failed:", err.response?.status);
    authPermission = [];
  }
}



  res.status(200).json({
    success: true,
    message: "Logged in successfully",
    status: 200,
    token, // Show token in response as requested
    fcmToken: fcmToken || staff.fcmToken, // Return latest FCM token for client use
    data: staff,
    error: null,
     authDefaultPermission: 1,
    authPermission
  });
});

// GET hospitals for a staff (internal)
export const getStaffHospitals: any = asyncHandler(async (req: Request, res: Response) => {
  const staffId = parseInt(req.params.id as string);
  if (isNaN(staffId)) {
    res.status(400).json({ success: false, message: 'Invalid staff id' });
    return;
  }

  let records = await StaffHospital.findAll({ where: { staffId } });

  if (!records.length) {
    const staff = await Staff.findOne({ where: { id: staffId, isDelete: false } });

    if (staff?.hospitalId) {
      const [membership] = await StaffHospital.findOrCreate({
        where: {
          staffId: staff.id,
          hospitalId: staff.hospitalId,
        },
        defaults: {
          staffId: staff.id,
          hospitalId: staff.hospitalId,
          status: "ACTIVE",
          joinedAt: staff.joiningDate || new Date(),
        },
      });

      records = [membership];
    }
  }

  res.status(200).json({ success: true, data: records });
});

// LOGIN WITH PHONE - POST /staff/login/phone
export const loginWithPhone: any = asyncHandler(async (req: Request, res: Response) => {
  const { phone, hospitalId } = req.body;
  if (!phone) {
    res.status(400).json({ success: false, message: "Phone number is required" });
    return;
  }

  let numericPhone = phone.replace(/\D/g, "").slice(-10);
  const staffs = await Staff.findAll({
    where: {
      phone: numericPhone,
      isDelete: false,
      ...(hospitalId ? { hospitalId } : {}),
    },
  });

  if (!staffs.length) {
    res.status(404).json({ success: false, message: "Phone number not registered!" });
    return;
  }

  if (staffs.length > 1 && !hospitalId) {
    res.status(200).json({
      success: true,
      requireHospitalSelection: true,
      hospitals: staffs.map((s) => ({
        staffId: s.id,
        hospitalId: s.hospitalId,
        hospitalName: s.hospitalName,
      })),
    });
    return;
  }

  const staff = staffs[0];

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  staff.otp = otp;
  staff.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  await staff.save();

  try {
    const client = getTwilioClient();
    const from = process.env.TWILIO_NUMBER;

    if (client && from) {
      const targetNumber = phone.startsWith("+") ? phone : `+91${numericPhone}`;
      await client.messages.create({
        body: `Your verification code is: ${otp}. Valid for 5 minutes.`,
        from: from,
        to: targetNumber,
      });
      logger.info("OTP SMS sent successfully", { phone: targetNumber });
    } else {
      logger.warn("Development Mode: OTP created but not sent via SMS (Missing Twilio Config)", {
        numericPhone,
        otp
      });
    }
  } catch (twilioError: any) {
    logger.error("Production Error: Twilio SMS failed to send", {
      error: twilioError.message,
      phone: numericPhone,
      otp
    });
  }

  res.status(200).json({
    success: true,
    message: "OTP sent successfully",
    status: 200,
    otp: process.env.NODE_ENV === "development" ? otp : undefined,
  });
});

// VERIFY OTP - POST /staff/verify-otp
export const verifyOtp: any = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp, fcmToken, hospitalId } = req.body;

  if (!phone || !otp) {
    res.status(400).json({ success: false, message: "Phone and OTP are required" });
    return;
  }

  let numericPhone = phone.replace(/\D/g, "").slice(-10);
  const staffs = await Staff.findAll({
    where: {
      phone: numericPhone,
      isDelete: false,
      ...(hospitalId ? { hospitalId } : {}),
    },
  });

  if (!staffs.length) {
    res.status(400).json({ success: false, message: "Invalid OTP" });
    return;
  }

  if (staffs.length > 1 && !hospitalId) {
    res.status(200).json({
      success: true,
      requireHospitalSelection: true,
      hospitals: staffs.map((s) => ({
        staffId: s.id,
        hospitalId: s.hospitalId,
        hospitalName: s.hospitalName,
      })),
    });
    return;
  }

  const staff = staffs[0];

  if (!staff || staff.otp !== otp.toString()) {
    res.status(400).json({ success: false, message: "Invalid OTP" });
    return;
  }

  if (staff.otpExpiry && new Date() > staff.otpExpiry) {
    res.status(400).json({ success: false, message: "OTP has expired" });
    return;
  }

  // Persist FCM token if provided, then clear OTP
  if (fcmToken) {
    staff.fcmToken = fcmToken;
  }

  staff.otp = undefined;
  staff.otpExpiry = undefined;
  await staff.save();

  const jwtKey = process.env.JWT_SECRET;
  if (!jwtKey) {
    res.status(500).json({ success: false, message: "JWT_SECRET not defined" });
    return;
  }

  const token = jwt.sign({ id: staff.id, name: staff.name, role: "staff", roleId: staff.roleId, hospitalId: staff.hospitalId, isRefresh: false }, jwtKey, { expiresIn: "1d" });
  const refreshToken = jwt.sign({ id: staff.id, name: staff.name, role: "staff", roleId: staff.roleId, hospitalId: staff.hospitalId, isRefresh: true }, jwtKey, { expiresIn: "2w" });

  // Save refresh token to Redis (REMOVED)

  setRefreshTokenCookie(res, refreshToken);

  res.status(200).json({
    success: true,
    message: "OTP verified successfully",
    token,
    data: staff,
    status: 200,
  });
});

// GET ONE - GET /staff/:id
export const getanStaff: any = asyncHandler(async (req: Request, res: Response) => {
  const staff = await Staff.findOne({ where: { id: req.params.id, isDelete: false } });
  if (!staff) {
    res.status(404).json({
      success: false,
      message: "Staff not found",
      data: null,
      error: { code: "STAFF_NOT_FOUND", details: null },
    });
    return;
  }

  res.status(200).json({
    success: true,
    status: "Success",
    data: staff,
    error: null,
  });
});

// UPDATE - PUT /staff/:id
export const updateData: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { id: _, ...updatePayload } = req.body; // Remove id from payload if present




  const authPayload: any = {};

if (updatePayload.email)
  authPayload.email = updatePayload.email;

if (updatePayload.phone)
  authPayload.phone = updatePayload.phone;

if (updatePayload.password)
  authPayload.password = updatePayload.password;

if (updatePayload.roleId)
  authPayload.roleId = updatePayload.roleId;

if (updatePayload.name)
  authPayload.staffName = updatePayload.name;

if (updatePayload.hospitalId)
  authPayload.hospitalId = updatePayload.hospitalId;

if (updatePayload.hospitalName)
  authPayload.hospitalName = updatePayload.hospitalName;




  const staff = await Staff.findOne({ where: { id, isDelete: false } });

  if (!staff) {
    res.status(404).json({
      success: false,
      message: "Staff not found",
      error: { code: "STAFF_NOT_FOUND", details: null },
    });
    return;
  }

  // Validate hospitalId if it's being updated
  if (updatePayload.hospitalId) {
    try {

      const hospitalResponse = await axios.get(`${process.env.HOSPITAL_SERVICE_URL}/hospital/${updatePayload.hospitalId}`);

      if (!hospitalResponse.data || !hospitalResponse.data.success) {
        res.status(400).json({ success: false, message: "Invalid hospital ID" });
        return;
      }
      updatePayload.hospitalName = hospitalResponse.data?.data?.name || updatePayload.hospitalName;
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Hospital validation failed. Please ensure the hospital exists.",
        error: { code: "HOSPITAL_VALIDATION_FAILED" }
      });
      return;
    }
  }

  try {
    // 🔥 Use instance update to trigger beforeUpdate hooks (password hashing)
    await staff.update(updatePayload);


      // update auth staff

      
   if(updatePayload.email || updatePayload.phone || updatePayload.password  ||updatePayload.roleId || updatePayload.name ||updatePayload.hospitalId ||updatePayload.hospitalName ){


   try {
   await axios.put(
    `${process.env.AUTH_SERVICE_URL}/auth/${staff.id}/role/${"staff"}`,
    {
     updatePayload: authPayload
    },
     {
      headers: {
        Authorization: req.headers.authorization || "",
      },
    }
  );

} catch (error: any) {
  console.error(
    "Failed to update auth staff:",
    error.response?.data || error.message
  );

  throw new Error("Failed to update authentication staff");
}}

    await publishEvent("staff_events", "STAFF_UPDATED", {
      staffId: staff.id,
      staffName: staff.name,
      hospitalId: staff.hospitalId,
      hospitalName: staff.hospitalName,
      updatedByRole: (req as any).user?.role || "hospital",
    });

    res.status(200).json({
      success: true,
      message: "Successfully updated",
      data: staff,
      error: null,
    });
  } catch (error: any) {
    if (error.name === "SequelizeUniqueConstraintError") {
      res.status(400).json({
        success: false,
        message: "Phone or email already in use by another staff member",
        error: { code: "CONFLICT", details: error.errors[0].message }
      });
    } else if (error.name === "SequelizeValidationError") {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        error: { code: "BAD_REQUEST", details: error.errors.map((e: any) => e.message) }
      });
    } else {
      throw error;
    }
  }
});

// DELETE - DELETE /staff/:id
export const staffDelete: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const staff = await Staff.findOne({ where: { id, isDelete: false } });
  if (!staff) {
    res.status(404).json({
      success: false,
      message: "Staff not found",
      data: null,
      error: { code: "STAFF_NOT_FOUND", details: null },
    });
    return;
  }



  // 🔥 Move to blacklist (soft delete)
  await staff.update({
    isActive: false,
    isDelete: true,
    deleteDate: new Date(),
  });

  try {
    await redisClient.del(`membership:staff:${id}:${staff.hospitalId}`);
  } catch (err: any) {
    console.error("Failed to invalidate membership cache:", err.message);
  }



      // delete auth staff

      const updatePayload = {
        isActive: false,
        isDelete: true,
        deleteDate: new Date(),
      }
   try {
   await axios.put(
    `${process.env.AUTH_SERVICE_URL}/auth/${staff.id}/role/${"staff"}`,
    {
     updatePayload
    },
     {
      headers: {
        Authorization: req.headers.authorization || "",
      },
    }
  );

} catch (error: any) {
  console.error(
    "Failed to update auth staff:",
    error.response?.data || error.message
  );

  throw new Error("Failed to update authentication staff");
}


    await publishEvent("staff_events", "STAFF_DELETED", {
      staffId: staff.id,
      hospitalId: staff.hospitalId,
      hospitalName: staff.hospitalName,
      staffName: staff.name,
      email: staff.email,
    });

  res.status(200).json({
    success: true,
    message: "Staff account moved to blacklist.",
    status: 200,
    data: null,
    error: null,
  });
});


// GET ALL + SEARCH + PAGINATION - GET /staff

export const getStaffs = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    let {
      hospitalId,
      name,
      gender,
      phone,
      status,
      designation,
      staffType,
      email,
      staffId,
      search_query,
      page = 1,
      limit = 10,
    }: any = req.query;

    // normalize arrays
    const normalize = (val: any) =>
      Array.isArray(val) ? val[0] : val;

    hospitalId = normalize(hospitalId);
    name = normalize(name);
    gender = normalize(gender);
    phone = normalize(phone);
    status = normalize(status);
    designation = normalize(designation);
    staffType = normalize(staffType);
    email = normalize(email);
    staffId = normalize(staffId);
    search_query = normalize(search_query);
    page = normalize(page);
    limit = normalize(limit);
 

    page = Number(page) || 1;
    limit = Number(limit) || 10;

    const offset = (page - 1) * limit;

    // base filter
    // const whereClause: any = {
    //   isDelete: false,
    // };
    const whereClause: any = {};

    // hospital filter
    if (hospitalId) {
      whereClause.hospitalId = Number(hospitalId);
    }

    // boolean fix (IMPORTANT)
    if (status !== undefined) {
      whereClause.isActive = status === "true" || status === true;
    }

    // normal filters
    if (name) {
      whereClause.name = { [Op.iLike]: `%${name}%` };
    }

    if (gender) {
      whereClause.gender = { [Op.iLike]: `%${gender}%` };
    }

    if (phone) {
      whereClause.phone = { [Op.iLike]: `%${phone}%` };
    }

    if (staffId) {
      whereClause.staffId = { [Op.iLike]: `%${staffId}%` };
    }

    if (designation) {
      whereClause.designation = { [Op.iLike]: `%${designation}%` };
    }

    if (staffType) {
      whereClause.staffType = { [Op.iLike]: `%${staffType}%` };
    }

    if (email) {
      whereClause.email = { [Op.iLike]: `%${email}%` };
    }

    // GLOBAL SEARCH (FIXED)
    if (search_query) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search_query}%` } },
        { email: { [Op.iLike]: `%${search_query}%` } },
        { phone: { [Op.iLike]: `%${search_query}%` } },
        { designation: { [Op.iLike]: `%${search_query}%` } },
        { staffType: { [Op.iLike]: `%${search_query}%` } },
        { gender: { [Op.iLike]: `%${search_query}%` } },
        { staffId: { [Op.iLike]: `%${search_query}%` } },
        Sequelize.where(
          Sequelize.cast(
            Sequelize.json("address.district"),
            "TEXT"
          ),
          {
            [Op.iLike]: `%${search_query}%`,
          }
        ),

        Sequelize.where(
          Sequelize.cast(
            Sequelize.json("address.place"),
            "TEXT"
          ),
          {
            [Op.iLike]: `%${search_query}%`,
          }
        ),

        Sequelize.where(
          Sequelize.cast(
            Sequelize.json("address.state"),
            "TEXT"
          ),
          {
            [Op.iLike]: `%${search_query}%`,
          }
        ),

        Sequelize.where(
          Sequelize.cast(
            Sequelize.json("address.country"),
            "TEXT"
          ),
          {
            [Op.iLike]: `%${search_query}%`,
          }
        ),

        Sequelize.where(
          Sequelize.cast(
            Sequelize.json("address.pincode"),
            "TEXT"
          ),
          {
            [Op.iLike]: `%${search_query}%`,
          }
        ),
      ];
    }

    const { count, rows } = await Staff.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    if (!rows.length) {
      res.status(404).json({
        success: false,
        message: "No data found",
        data: [],
        pagination: {
          totalItems: 0,
          totalPages: 0,
          currentPage: page,
          limit,
        },
        error: {
          code: "NO_DATA_FOUND",
          details: null,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Staff fetched successfully",
      data: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit,
        hasNextPage: page < Math.ceil(count / limit),
        hasPreviousPage: page > 1,
      },
      error: null,
    });
  }
);



// GET BLACKLISTED - GET /staff/blacklist
export const getBlacklistedStaffs: any = asyncHandler(async (req: Request, res: Response) => {
  const staff = await Staff.findAll({
    where: { isDelete: true }
  });

  if (staff.length === 0) {
    res.status(404).json({
      success: false,
      message: "No blacklisted staff found",
      data: null,
      error: { code: "NO_DATA_FOUND", details: null },
    });
    return;
  }

  res.status(200).json({
    success: true,
    status: "Success",
    data: staff,
    error: null,
  });
});

// RECOVER FROM BLACKLIST - PUT /staff/recover/:id
export const recoverStaff: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const staff = await Staff.findOne({
    where: {
      id,
      isDelete: true,
    },
  });

  if (!staff) {
    res.status(404).json({
      success: false,
      message: "Blacklisted staff not found",
      data: null,
      error: { code: "STAFF_NOT_FOUND", details: null },
    });
    return;
  }

  await staff.update({
    isDelete: false,
    isActive: true,
    deleteDate: null,
  });


      // update auth staff



      const updatePayload = {
        isActive: true,
        isDelete: false,
        deleteDate: null,
      }
   try {
   await axios.put(
    `${process.env.AUTH_SERVICE_URL}/auth/${staff.id}/role/${"staff"}`,
    {
     updatePayload
    },
     {
      headers: {
        Authorization: req.headers.authorization || "",
      },
    }
  );

} catch (error: any) {
  console.error(
    "Failed to update auth staff:",
    error.response?.data || error.message
  );

  throw new Error("Failed to update authentication staff");
}

  await publishEvent("staff_events", "STAFF_RECOVERED", {
    staffId: staff.id,
    staffName: staff.name,
    email: staff.email,
    hospitalId: staff.hospitalId,
    hospitalName: staff.hospitalName,
  });

  res.status(200).json({
    success: true,
    message: "Staff recovered successfully",
    data: staff,
    error: null,
  });
});

// CHANGE PASSWORD - PUT /staff/changepassword
export const changepassword: any = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, newPassword } = req.body;

  const staff = await Staff.scope("withPassword").findOne({ where: { email, isDelete: false } });
  if (!staff) {
    res.status(404).json({
      success: false,
      message: "Staff not found",
      data: null,
      error: { code: "STAFF_NOT_FOUND", details: null },
    });
    return;
  }

  // If password is provided, verify it first (like user service)
  if (password) {

    const isMatch = await bcrypt.compare(password, staff.password);

    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Incorrect current password",
        error: { code: "UNAUTHORIZED", details: null }
      });
      return;
    }
  }

  staff.password = newPassword || password; // Use newPassword if provided, else keep same if verified? No, usually it's for reset.

  if (newPassword) {
    staff.password = newPassword;
  }

  await staff.save();

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
    status: 200,
    data: staff,
    error: null,
  });
});

// SEND STAFF OTP (EMAIL) - POST /staff/auth/send-otp
export const sendStaffOtp: any = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ success: false, message: "Email is required" });
    return;
  }

  const staff = await Staff.findOne({ where: { email, isDelete: false } });
  if (!staff) {
    res.status(404).json({ success: false, message: "Staff not found with this email" });
    return;
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  await staff.update({ otp, otpExpiry });

  try {
    await sendStaffOtpEmail(email, otp, staff.name);
    res.json({ success: true, message: "OTP sent to email" });
    return;
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send email" });
    return;
  }
});

// VERIFY STAFF OTP - POST /staff/auth/verify-otp
export const verifyStaffOtp: any = asyncHandler(async (req: Request, res: Response) => {
  const { phone, email, otp } = req.body;

  if ((!phone && !email) || !otp) {
    res.status(400).json({ success: false, message: "Identifier (phone/email) and OTP are required" });
    return;
  }

  let staff;
  if (phone) {
    let numericPhone = phone.replace(/\D/g, "").slice(-10);
    staff = await Staff.scope("withPassword").findOne({ where: { phone: numericPhone, isDelete: false } });
  } else if (email) {
    staff = await Staff.scope("withPassword").findOne({ where: { email, isDelete: false } });
  }

  if (!staff || staff.otp !== otp.toString()) {
    res.status(400).json({ success: false, message: "Invalid OTP" });
    return;
  }

  if (staff.otpExpiry && new Date() > staff.otpExpiry) {
    res.status(400).json({ success: false, message: "OTP has expired" });
    return;
  }

  // Clear OTP after successful verification
  await staff.update({ otp: null, otpExpiry: null });


  const jwtKey = process.env.JWT_SECRET;
  const token = jwt.sign({ id: staff.id, name: staff.name, role: "staff", roleId: staff.roleId, hospitalId: staff.hospitalId, isRefresh: false }, jwtKey, {
    expiresIn: "1d",
  });
  const refreshToken = jwt.sign({ id: staff.id, name: staff.name, role: "staff", roleId: staff.roleId, hospitalId: staff.hospitalId, isRefresh: true }, jwtKey, {
    expiresIn: "2w",
  });

  // Save refresh token to Redis (REMOVED)

  setRefreshTokenCookie(res, refreshToken);

  res.status(200).json({
    success: true,
    message: "OTP verified",
    token,
    data: staff
  });
});

// RESET STAFF PASSWORD - POST /staff/auth/reset-password
export const resetStaffPassword: any = asyncHandler(async (req: any, res: Response) => {
  const { email,newPassword } = req.body;

  const staff = await Staff.scope("withPassword").findOne({ where: {email } });

  if (!staff) {
    res.status(404).json({ success: false, message: "Staff not found" });
    return;
  }

  staff.password = newPassword;
  staff.otp = null as any;
  staff.otpExpiry = null as any;

  await staff.save();

  // Notify hospital about password reset (include newPassword for notification)
  await publishEvent("staff_events", "STAFF_PASSWORD_RESET", {
    staffId: staff.id,
    staffName: staff.name,
    hospitalId: staff.hospitalId,
    newPassword: newPassword,
  });

  res.json({ success: true, message: "Password reset successful" });
});

// CHANGE STAFF PASSWORD (JWT) - PUT /staff/auth/change-password
// export const changeStaffPassword: any = asyncHandler(async (req: any, res: Response) => {
//   const { currentPassword, newPassword, staffId } = req.body;

//   const staff = await Staff.scope("withPassword").findOne({ where: { id: req.user.id  || staffId, isDelete: false } });
//   if (!staff) {
//     res.status(404).json({ success: false, message: "Staff not found" });
//     return;
//   }

//   const isMatch = await bcrypt.compare(currentPassword, staff.password || "");
//   if (!isMatch) {
//     res.status(401).json({ success: false, message: "Incorrect current password" });
//     return;
//   }


//   staff.password = newPassword;
//   await staff.save();

//   // Notify hospital about password change (include newPassword for notification)
//   await publishEvent("staff_events", "STAFF_PASSWORD_CHANGED", {
//     staffId: staff.id,
//     staffName: staff.name,
//     hospitalId: staff.hospitalId,
//     newPassword: newPassword
//   });

//   res.json({ success: true, message: "Password changed successfully" });
// });


// CHANGE STAFF PASSWORD (ADMIN) - PUT /staff/auth/change-password/:id
export const changeStaffPassword: any = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { newPassword, confirmPassword } = req.body;

  // 1. Validate input (also enforced by the zod schema, kept here as a safety net)
  if (!newPassword || !confirmPassword) {
    res.status(400).json({
      success: false,
      message: "newPassword and confirmPassword are required",
    });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({
      success: false,
      message: "Passwords do not match",
    });
    return;
  }

  // 2. Find the staff member
  const staff = await Staff.findOne({ where: { id, isDelete: false } });
  if (!staff) {
    res.status(404).json({ success: false, message: "Staff not found" });
    return;
  }

  // 3. Update password in staff-service DB (model hook hashes it)
  staff.password = newPassword;
  await staff.save();

  // 4. Sync the new password to auth-service
  try {
    const authServiceUrl = process.env.AUTH_SERVICE_URL || "http://auth-service:3020";
    await axios.put(
      `${authServiceUrl}/auth/internal/staff/${staff.id}/password`,
      { newPassword },
      {
        headers: {
          "x-service-secret": process.env.INTERNAL_SERVICE_SECRET,
        },
      }
    );
  } catch (error: any) {
    logger.error(
      "Failed to sync staff password change with auth-service:",
      error.response?.data || error.message
    );
    // staff DB already updated; the two DBs are now out of sync
    // until this is retried/reconciled
  }

  // 5. Notify other services (include plaintext newPassword for notification display)
  await publishEvent("staff_events", "STAFF_PASSWORD_CHANGED", {
    staffId: staff.id,
    staffName: staff.name,
    hospitalId: staff.hospitalId,
    newPassword: newPassword,
    changedAt: new Date().toISOString(),
  });

  res.json({ success: true, message: "Password changed successfully" });
});











export const updateStaffPassword = async (req: Request, res: Response) => {
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "newPassword and confirmPassword are required",
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match",
    });
  }


  const staff = await Staff.findByPk(req.params.id);

  if (!staff) {
    return res.status(404).json({
      success: false,
      message: "Staff not found",
    });
  }



  staff.password = newPassword;


  await staff.save();

  try {
    // Notify auth-service to update the password there as well
    const authServiceUrl = process.env.AUTH_SERVICE_URL || "http://auth-service:3020";
    await axios.put(
      `${authServiceUrl}/auth/internal/staff/${staff.id}/password`,
      {
        newPassword: newPassword, // Note: auth-service expects "newPassword"
      },
      {
        headers: {
          "x-service-secret": process.env.INTERNAL_SERVICE_SECRET,
        },
      }
    );
  } catch (error: any) {
    logger.error("Failed to sync staff password change with auth-service:", error.response?.data || error.message);
    // We continue anyway since staff DB is updated
  }


  // Notify hospital that the staff reset their password
  await publishEvent("staff_events", "STAFF_PASSWORD_RESET", {
    staffId: staff.id,
    staffName: staff.name,
    hospitalId: staff.hospitalId,
    newPassword: newPassword
  });

  res.json({
    success: true,
    message: "Password updated in staff and auth service",
  });
};



































// REFRESH TOKEN - POST /staff/refresh
export const refreshStaffToken: any = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    res.status(401).json({ success: false, message: "Refresh token missing" });
    return;
  }


  const jwtKey = process.env.JWT_SECRET;

  try {
    const decoded: any = jwt.verify(refreshToken, jwtKey);

    // Check Redis Blacklist / Rotation (REMOVED)

    const staff = await Staff.findByPk(decoded.id);

    if (!staff) {
      res.status(401).json({ success: false, message: "Invalid refresh token" });
      return;
    }

    const newToken = jwt.sign({ id: staff.id, name: staff.name, role: "staff", roleId: staff.roleId, hospitalId: staff.hospitalId, isRefresh: false }, jwtKey, {
      expiresIn: "1d",
    });

    res.status(200).json({
      success: true,
      token: newToken,
    });
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
  }
});

// LOGOUT - POST /staff/logout
export const logout: any = asyncHandler(async (req: Request, res: Response) => {
  // Redis Blacklist (REMOVED)


const { deviceId } = req.body;

const staff = await Staff.findByPk(req.params.id);

if (!staff) {
   res.status(404).json({
    success: false,
    message: "Staff not found",
  });
  return;
}

staff.fcmToken = staff.fcmToken.filter(
  (device: any) => device.deviceId !== deviceId
);

await staff.save();

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

// SAVE FCM TOKEN - POST /staff/:id/fcm-token
export const saveFcmToken: any = asyncHandler(async (req: Request, res: Response) => {
  const { fcmToken } = req.body;
  const { id } = req.params;

  if (!fcmToken) {
    res.status(400).json({
      success: false,
      message: "FCM token is required",
      error: { code: "MISSING_FCM_TOKEN", details: null },
    });
    return;
  }

  const staff = await Staff.findByPk(id);
  if (!staff) {
    res.status(404).json({
      success: false,
      message: "Staff not found",
      error: { code: "STAFF_NOT_FOUND", details: null },
    });
    return;
  }

  await staff.update({ fcmToken });

  res.status(200).json({
    success: true,
    message: "FCM token saved successfully",
    data: { id: staff.id, fcmToken: staff.fcmToken },
    error: null,
  });
});


export const getStaffEmails: any = asyncHandler(
  async (req: Request, res: Response) => {
    const { ids, roleId, hospitalId } = req.body;
    if (!ids || !Array.isArray(ids)) {
      res.status(400).json({ success: false, message: "ids array is required" });
      return;
    }
    
    const whereClause: any = { id: { [Op.in]: ids } };
    if (roleId) whereClause.roleId = roleId;
    if (hospitalId) whereClause.hospitalId = Number(hospitalId);

    const staffs = await Staff.findAll({
      where: whereClause,
      attributes: ['id', 'email', 'name', 'roleId']
    });

    const results = staffs
      .filter(s => s.email)
      .map(s => ({
        id: s.id,
        email: s.email,
        name: s.name,
        roleId: s.roleId
      }));

    res.status(200).json(results);
  }
);

// GET STAFF EMAILS BY ROLE IDS - POST /staff/emails-by-roles
export const getStaffEmailsByRoles: any = asyncHandler(
  async (req: Request, res: Response) => {
    const { roleIds, hospitalId } = req.body;
    if (!roleIds || !Array.isArray(roleIds) || !hospitalId) {
      res.status(400).json({ success: false, message: "roleIds array and hospitalId are required" });
      return;
    }

    const staffs = await Staff.findAll({
      where: {
        roleId: { [Op.in]: roleIds },
        hospitalId: Number(hospitalId),
        isActive: true,
        isDelete: false,
      },
      attributes: ['id', 'email', 'name', 'roleId']
    });

    const results = staffs
      .filter(s => s.email)
      .map(s => ({
        id: s.id,
        email: s.email,
        name: s.name,
        roleId: s.roleId
      }));

    res.status(200).json(results);
  }
);

// UPDATE FCM TOKEN BY EMAIL - POST /staff/update-fcm-token
export const updateFcmTokenByEmail: any = asyncHandler(async (req: Request, res: Response) => {
  const { email, fcmToken } = req.body;

  if (!email || !fcmToken) {
    res.status(400).json({
      success: false,
      message: "Email and FCM token are required",
      error: { code: "MISSING_REQUIRED_FIELDS", details: null },
    });
    return;
  }

  const staff = await Staff.findOne({ where: { email } });
  if (!staff) {
    res.status(404).json({
      success: false,
      message: "Staff not found",
      error: { code: "STAFF_NOT_FOUND", details: null },
    });
    return;
  }

  const existingTokens: FCMTOKEN[] = Array.isArray(staff.fcmToken)
    ? staff.fcmToken
    : [];

  const newTokens: FCMTOKEN[] = Array.isArray(fcmToken)
    ? fcmToken
    : [fcmToken];

  const updatedTokens = [
    ...existingTokens.filter(
      (oldToken) =>
        !newTokens.some(
          (newToken) =>
            newToken.deviceId === oldToken.deviceId
        )
    ),
    ...newTokens,
  ];

  await staff.update({
    fcmToken: updatedTokens,
  });

  res.status(200).json({
    success: true,
    message: "FCM token updated successfully",
    data: { id: staff.id, fcmToken: updatedTokens },
    error: null,
  });
});


