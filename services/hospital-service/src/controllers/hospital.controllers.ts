import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import Hospital from "../models/hospital.model";
import { publishEvent } from "../events/publisher";
import { Op, Sequelize } from "sequelize";
import twilio from "twilio";
import { logger } from "../utils/logger";
import { sendEmail } from "../services/mail.service";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

interface FCMTOKEN {
  deviceId: string;
  fcmToken: string;
  platform: "android" | "ios" | "web";
}

// Helper to set refresh token cookie
const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 14 * 24 * 60 * 60 * 1000, // 2 weeks
    path: "/",
  });
};

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

export const sendOtpEmail = async (email: string, otp: string, hospitalName: string) => {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
      <div style="background-color: #007bff; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: 1px;">Hosta Hospital</h1>
      </div>
      <div style="padding: 40px; background-color: #ffffff;">
        <h2 style="color: #333; margin-top: 0;">Verification Code</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">Hello <strong>${hospitalName}</strong>,</p>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">Use the following security code to complete your login. This code is valid for <strong>10 minutes</strong>.</p>
        
        <div style="text-align: center; margin: 40px 0;">
          <div style="display: inline-block; background-color: #f8f9fa; border: 2px dashed #007bff; border-radius: 8px; padding: 20px 40px; font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 8px;">
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

  await sendEmail(email, "Your Verification Code - Hosta Hospital", html);
};

// REGISTER - POST /hospital/register
export const Registeration: any = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    type,
    address,
    phone,
    emergencyContact,
    email,
    password,
    roleId,
    latitude,
    longitude,
    about,
    working_hours_clinic,
    working_hours_general,
    working_hours_clinic_nobreak,
    web,
    fcmToken,
  } = req.body;

  // Ensure type is always a string (not an ID)
  const hospitalType = (type && typeof type !== 'string') ? String(type) : type;

  const exist = await Hospital.findOne({ where: { phone } });
  if (exist) {
    res.status(404).json({
      success: false,
      message: "Hospital is already exist",
      data: null,
      error: { code: "HOSPITAL_ALREADY_EXISTS", details: null },
    });
    return;
  }

  const newHospital = await Hospital.create({
    name,
    phone,
    email,
    password,
    roleId,
    type: hospitalType,
    emergencyContact,
    latitude,
    longitude,
    about,
    working_hours_clinic,
    working_hours_general,
    address,
    working_hours_clinic_nobreak,
    web,
    fcmToken,
    status: 'PENDING',
  });

  // Publish HOSPITAL_CREATED event to RabbitMQ for Auth Service to consume
  await publishEvent("auth_events", "HOSPITAL_CREATED", {
    hospitalId: newHospital.id,
    email: newHospital.email,
    phone: newHospital.phone,
    password: password, // raw password - Auth Service will hash it via its own beforeCreate hook
    role: "hospital",
    roleId: 2,
    hospitalName: newHospital.name,
  });

  await publishEvent("hospital_events", "HOSPITAL_REGISTERED", {
    hospitalId: newHospital.id,
    hospitalName: newHospital.name,
    phone: newHospital.phone,
    email: newHospital.email,
  });

  res.status(201).json({
    success: true,
    message: "Registration completed successfully. Account activation in progress.",
    data: { hospitalId: newHospital.id, status: newHospital.status },
    error: null,
  });
});

// LOGIN - POST /hospital/login
export const login: any = asyncHandler(async (req: Request, res: Response) => {
  const { email, phone, password, fcmToken } = req.body;

  if ((!email && !phone) || !password) {
    res.status(400).json({
      success: false,
      message: "Identifier (email/phone) and password are required",
    });
    return;
  }

  // Find hospital by email OR phone
  const hospital = await Hospital.scope("withPassword").findOne({
    where: {
      [Op.or]: [
        email ? { email } : null,
        phone ? { phone } : null,
      ].filter(Boolean) as any,
    },
  });

  if (!hospital) {
    res.status(401).json({
      success: false,
      message: "Hospital not found! Please register",
      data: null,
      error: { code: "HOSPITAL_NOT_FOUND", details: null },
    });
    return;
  }

  if (hospital.isDelete === true) {
    res.status(401).json({
      success: false,
      message: "Hospital account has been deactivated.",
      data: null,
      error: { code: "HOSPITAL_BLACKLISTED", details: null },
    });
    return;
  }

  if (fcmToken) {
    const hospital = await Hospital.findOne({
      where: { email },
    });

    if (hospital) {
      const existingTokens: FCMTOKEN[] = Array.isArray(hospital.fcmToken)
        ? hospital.fcmToken
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

      await hospital.update({
        fcmToken: updatedTokens,
      });
    }
  }
  const checkPassword = await bcrypt.compare(password, hospital.password || "");
  if (!checkPassword) {
    res.status(401).json({
      success: false,
      message: "Wrong password, Please try again",
      data: null,
      error: { code: "WRONG_PASSWORD", details: null },
    });
    return;
  }

  const jwtKey = process.env.JWT_SECRET || "supersecretjwtkey";
  const token = jwt.sign({ id: hospital.id, name: hospital.name, role: "hospital", roleId: hospital.roleId, isRefresh: false }, jwtKey, {
    expiresIn: "1d",
  });

  // Remove password and OTP fields from response
  const { password: _, otp: __, otpExpiry: ___, ...safeHospital } = hospital.get();

  const refreshToken = jwt.sign({ id: hospital.id, name: hospital.name, role: "hospital", roleId: hospital.roleId, isRefresh: true }, jwtKey, {
    expiresIn: "2w",
  });

  // Save refresh token to Redis (REMOVED)

  setRefreshTokenCookie(res, refreshToken);

  const authPermissionRes = await axios.get(
    `${process.env.ROLE_SERVICE_URL}/rolepermission`,
    {
      params: {
        roleId: hospital.roleId,
      },
    }
  );

  const authPermission = authPermissionRes.data;

  res.status(200).json({
    success: true,
    message: "Logged in successfully",
    status: 200,
    token,
    data: safeHospital,
    error: null,
    authDefaultPermission: 1,
    authPermission,
  });
});

// LOGIN WITH PHONE (OTP REQUEST) - POST /hospital/login/phone
export const loginWithPhone: any = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body;

  if (!phone) {
    res.status(400).json({ success: false, message: "Phone number is required" });
    return;
  }

  let numericPhone = phone.replace(/\D/g, "").slice(-10);

  const hospital = await Hospital.findOne({
    where: {
      phone: numericPhone,
      isDelete: false
    }
  });
  if (!hospital) {
    res.status(404).json({
      success: false,
      message: "Hospital not found with this phone number",
    });
    return;
  }

  // Generate JWT tokens
  const token = jwt.sign({ id: hospital.id, name: hospital.name, role: "hospital", roleId: hospital.roleId, isRefresh: false }, process.env.JWT_SECRET || "supersecretjwtkey", {
    expiresIn: "1d",
  });

  const refreshToken = jwt.sign(
    { id: hospital.id, name: hospital.name, role: "hospital", roleId: hospital.roleId, isRefresh: true },
    process.env.JWT_SECRET || "supersecretjwtkey",
    { expiresIn: "2w" }
  );

  // Generate 6-digit OTP
  const otp = numericPhone === APPLE_TEST_NUMBER
    ? APPLE_TEST_OTP
    : Math.floor(100000 + Math.random() * 900000).toString();

  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry

  await hospital.update({ otp, otpExpiry });

  if (numericPhone !== APPLE_TEST_NUMBER) {
    // 1. Send OTP via Twilio (SMS)
    const client = getTwilioClient();
    const twilioNumber = process.env.TWILIO_NUMBER;

    if (client && twilioNumber) {
      try {
        const targetNumber = phone.startsWith("+") ? phone : `+91${numericPhone}`;
        await client.messages.create({
          body: `Your Hosta Hospital verification code is: ${otp}. Valid for 10 minutes.`,
          from: twilioNumber,
          to: targetNumber,
        });
        logger.info("OTP SMS sent successfully", { phone: targetNumber });
      } catch (err: any) {
        logger.error("Twilio Error:", { message: err.message, phone: numericPhone });
      }
    }

    // 2. Send OTP via Email (if exists)
    if (hospital.email) {
      try {
        await sendOtpEmail(hospital.email, otp, hospital.name);
      } catch (err: any) {
        logger.error("Email OTP Error:", { message: err.message, email: hospital.email });
      }
    }
  }

  // Save refresh token to Redis (REMOVED)

  setRefreshTokenCookie(res, refreshToken);

  res.status(200).json({
    success: true,
    status: 200,
    token,
    otp,
    error: null,
    message: numericPhone === APPLE_TEST_NUMBER ? "OTP sent (TEST ACCOUNT)" : "OTP sent to your registered phone and email",
    data: numericPhone === APPLE_TEST_NUMBER ? { otp: APPLE_TEST_OTP } : null,
  });
});

// SEND OTP (EMAIL) - POST /hospital/auth/send-otp
export const sendOtp: any = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ success: false, message: "Email is required" });
    return;
  }

  const hospital = await Hospital.findOne({ where: { email } });
  if (!hospital) {
    res.status(404).json({ success: false, message: "Hospital not found with this email" });
    return;
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  await hospital.update({ otp, otpExpiry });

  try {
    await sendOtpEmail(email, otp, hospital.name);
    res.json({ success: true, message: "OTP sent to email" });
    return;
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send email" });
    return;
  }
});

// VERIFY OTP - POST /hospital/auth/verify-otp & /hospital/otp
export const verifyOtp: any = asyncHandler(async (req: Request, res: Response) => {
  const { phone, email, otp, fcmToken } = req.body;

  if ((!phone && !email) || !otp) {
    res.status(400).json({ success: false, message: "Identifier (phone/email) and OTP are required" });
    return;
  }

  let hospital;
  if (phone) {
    let numericPhone = phone.replace(/\D/g, "").slice(-10);
    hospital = await Hospital.scope("withPassword").findOne({ where: { phone: numericPhone } });
  } else if (email) {
    hospital = await Hospital.scope("withPassword").findOne({ where: { email } });
  }

  if (!hospital || hospital.otp !== otp.toString()) {
    res.status(400).json({ success: false, message: "Invalid OTP" });
    return;
  }

  if (hospital.otpExpiry && new Date() > hospital.otpExpiry) {
    res.status(400).json({ success: false, message: "OTP has expired" });
    return;
  }

  if (fcmToken) {
    await hospital.update({ fcmToken });
  }

  // Clear OTP after successful verification
  await hospital.update({ otp: null, otpExpiry: null });

  const jwtKey = process.env.JWT_SECRET || "supersecretjwtkey";
  const token = jwt.sign({ id: hospital.id, name: hospital.name, role: "hospital", roleId: hospital.roleId, isRefresh: false }, jwtKey, {
    expiresIn: "1d",
  });

  // Remove password and OTP fields from response
  const { password: _, otp: __, otpExpiry: ___, ...safeHospital } = hospital.get();

  const refreshToken = jwt.sign({ id: hospital.id, name: hospital.name, role: "hospital", roleId: hospital.roleId, isRefresh: true }, jwtKey, {
    expiresIn: "2w",
  });

  // Save refresh token to Redis (REMOVED)

  setRefreshTokenCookie(res, refreshToken);

  res.status(200).json({
    success: true,
    message: "OTP verified",
    token,
    data: safeHospital
  });
});

export const verifyLoginOtp = verifyOtp;

// RESET PASSWORD - POST /hospital/auth/reset-password
export const resetPassword: any = asyncHandler(async (req: any, res: Response) => {
  const { email, newPassword } = req.body;

  const hospital = await Hospital.scope("withPassword").findOne({ where: { email } });

  if (!hospital) {
    res.status(404).json({ success: false, message: "Hospital not found" });
    return;
  }

  hospital.password = newPassword;
  hospital.otp = null as any;
  hospital.otpExpiry = null as any;

  await hospital.save();

  res.json({ success: true, message: "Password reset successful" });
});

// CHANGE PASSWORD (JWT) - PUT /hospital/auth/change-password
export const changePassword: any = asyncHandler(async (req: any, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  const hospital = await Hospital.scope("withPassword").findByPk(req.user.id);
  if (!hospital) {
    res.status(404).json({ success: false, message: "Hospital not found" });
    return;
  }

  const isMatch = await bcrypt.compare(currentPassword, hospital.password || "");
  if (!isMatch) {
    res.status(401).json({ success: false, message: "Incorrect current password" });
    return;
  }

  hospital.password = newPassword;
  await hospital.save();

  res.json({ success: true, message: "Password changed successfully" });
});


// GET ONE - GET /hospital/:id
export const getanHospital: any = asyncHandler(async (req: Request, res: Response) => {
  const hospital = await Hospital.findOne({
    where: {
      id: req.params.id,
      isDelete: false
    }
  });

  if (!hospital) {
    res.status(404).json({
      success: false,
      message: "Hospital not found",
      data: null,
      error: { code: "HOSPITAL_NOT_FOUND", details: null },
    });
    return;
  }

  res.status(200).json({
    success: true,
    status: "Success",
    data: hospital,
    error: null,
  });
});

// UPDATE - PUT /hospital/:id
export const updateData: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updatePayload = req.body;

  // Ensure type is always a string (not an ID)
  if (updatePayload.type && typeof updatePayload.type !== 'string') {
    updatePayload.type = String(updatePayload.type);
  }

  let hospital: any;
  try {
    hospital = await Hospital.update(updatePayload, {
      where: { id, isDelete: false },
      returning: true,
      validate: false,   // validators run at request level; skip Sequelize re-validation on partial update
    });
  } catch (err: any) {
    if (err.name === "SequelizeValidationError" || err.name === "SequelizeUniqueConstraintError") {
      const msgs = err.errors?.map((e: any) => e.message) ?? [err.message];
      res.status(400).json({ success: false, message: msgs.join(", "), error: { code: "VALIDATION_ERROR", details: msgs } });
      return;
    }
    throw err; // re-throw unknown errors to global handler
  }

  if (!hospital[1] || hospital[1].length === 0) {
    res.status(404).json({
      success: false,
      message: "Hospital not found",
      data: null,
      error: { code: "HOSPITAL_NOT_FOUND", details: null },
    });
    return;
  }

  // update auth hospital
  if (updatePayload.email || updatePayload.phone || updatePayload.password || updatePayload.name) {

    updatePayload.hospitalName = updatePayload.name;
    delete updatePayload.name;

    console.log("updatePayload", updatePayload)

    try {
      // Only send fields that exist in auth model
      const authUpdatePayload: any = {};
      if (updatePayload.email) authUpdatePayload.email = updatePayload.email;
      if (updatePayload.phone) authUpdatePayload.phone = updatePayload.phone;
      if (updatePayload.password) authUpdatePayload.password = updatePayload.password;
      if (updatePayload.hospitalName) authUpdatePayload.hospitalName = updatePayload.hospitalName;
      // Explicitly exclude type and other hospital-specific fields from auth update
      // Never add type to authUpdatePayload
      

      await axios.put(
        `${process.env.AUTH_SERVICE_URL}/auth/${hospital[1][0].id}/role/${"hospital"}`,
        {
          updatePayload: authUpdatePayload,
        },
        {
          headers: {
            Authorization: req.headers.authorization || "",
          },
        }
      );

    } catch (error: any) {
      console.error(
        "Failed to update auth hospital:",
        error.response?.data || error.message
      );

      throw new Error(error.response?.data?.message || error.message || "Failed to update authentication hospital");
    }
  }



  const updatedHospital = hospital[1][0];

  // Fetch staff and doctor IDs for notification fan-out (failures are non-fatal)
  let staffIds: number[] = [];
  let doctorIds: number[] = [];

  try {
    const staffRes = await axios.get(`${process.env.STAFF_SERVICE_URL}/staff`, {
      params: { hospitalId: updatedHospital.id },
    });
    const raw = staffRes.data?.data ?? [];
    staffIds = raw.map((s: any) => s.id).filter(Boolean);
  } catch (err) {
    logger.warn("Could not fetch staffIds for hospital update notification", { hospitalId: updatedHospital.id });
  }

  try {
    const doctorRes = await axios.get(`${process.env.DOCTOR_SERVICE_URL}/doctor`, {
      params: { hospitalId: updatedHospital.id },
    });
    const raw = doctorRes.data?.data ?? [];
    doctorIds = raw.map((d: any) => d.id).filter(Boolean);
  } catch (err) {
    logger.warn("Could not fetch doctorIds for hospital update notification", { hospitalId: updatedHospital.id });
  }

  // Publish event → notification-service fans out to superadmin, staff, doctors
  await publishEvent("hospital_events", "HOSPITAL_UPDATED", {
    hospitalId: updatedHospital.id,
    hospitalName: updatedHospital.name,
    staffIds,
    doctorIds,
  });

  res.status(200).json({
    success: true,
    message: "successfully updated",
    data: updatedHospital,
    error: null,
  });
});



export const updateHospitalPassword = async (
  req: Request,
  res: Response
) => {

  const { password } = req.body;

  const hospital = await Hospital.findByPk(req.params.id);

  if (!hospital) {
    return res.status(404).json({
      success: false,
      message: "Hospital not found"
    });
  }

  hospital.password = password;

  await hospital.save();

  res.json({
    success: true,
    message: "Password updated"
  });
};




// DELETE - DELETE /hospital/:id
export const hospitalDelete: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const hospital = await Hospital.findOne({
    where: { id, isDelete: false }
  });
  if (!hospital) {
    res.status(404).json({
      success: false,
      message: "Hospital not found",
      data: null,
      error: { code: "HOSPITAL_NOT_FOUND", details: null },
    });
    return;
  }

  // 🔥 Move to blacklist (soft delete)
  await hospital.update({
    isActive: false,
    isDelete: true,
    deleteDate: new Date(),
  });



  // update auth hospital

  const updatePayload = {
    isActive: false,
    isDelete: true,
    deleteDate: new Date(),
  }
  try {
    await axios.put(
      `${process.env.AUTH_SERVICE_URL}/auth/${id}/role/${"hospital"}`,
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
      "Failed to update auth hospital:",
      error.response?.data || error.message
    );

    throw new Error(error.response?.data?.message || error.message || "Failed to update authentication hospital");
  }

  await publishEvent("hospital_events", "HOSPITAL_BLACKLISTED", {
    hospitalId: id,
  });






  try {
    await axios.post(`${process.env.BULMQ_SERVICE_URL}/blacklist-reminder/hospital`, {
      hospitalId: id,
      hospitalName: hospital.name,
      phone: hospital.phone,
      blacklistDate: new Date(),
    }, {
      headers: { Authorization: req.headers.authorization }
    });
  } catch (error) {
    console.error("Failed to schedule hospital blacklist reminder:", error);
  }

  res.status(200).json({
    success: true,
    message: "Hospital account moved to blacklist. It will be permanently deleted after 30 days.",
    status: 200,
    data: null,
    error: null,
  });
});

// ============================================================
//  GET ALL – with optional distance sorting
// ============================================================
export const getHospital = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {

    const normalizeQuery = (value: any) =>
      Array.isArray(value) ? value[0] : value;

    let {
      speciality,
      lat,
      lng,
      radius,
      name,
      country,
      state,
      status,
      district,
      place,
      search_query,
      hospitalId,
      pincode,
      page = 1,
      limit = 10,
    }: any = req.query;

    // ---------- Normalize ----------
    speciality = String(normalizeQuery(speciality) || "");
    lat = parseFloat(normalizeQuery(lat)) || null;
    lng = parseFloat(normalizeQuery(lng)) || null;
    radius = parseFloat(normalizeQuery(radius)) || null;
    hospitalId = String(normalizeQuery(hospitalId) || "");
    name = String(normalizeQuery(name) || "");
    status = String(normalizeQuery(status) || "");
    country = String(normalizeQuery(country) || "");
    state = String(normalizeQuery(state) || "");
    district = String(normalizeQuery(district) || "");
    place = String(normalizeQuery(place) || "");
    pincode = String(normalizeQuery(pincode) || "");
    search_query = String(normalizeQuery(search_query) || "");
    page = String(normalizeQuery(page) || "");
    limit = String(normalizeQuery(limit) || "");

    // ---------- Pagination ----------
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    // ---------- WHERE Clause ----------
    const andConditions: any[] = [];

    // Hospital ID
    if (hospitalId && !isNaN(Number(hospitalId))) {
      andConditions.push({
        id: Number(hospitalId),
      });
    }

    // Status
    if (status) {
      andConditions.push({
        isActive: status === "true",
      });
    }

    // Name
    if (name.trim()) {
      andConditions.push({
        name: {
          [Op.iLike]: `%${name.trim()}%`,
        },
      });
    }

    // Speciality
    if (speciality.trim()) {
      andConditions.push({
        type: {
          [Op.iLike]: `%${speciality.trim()}%`,
        },
      });
    }

    // JSONB filters (pincode, place, country, state, district)
    if (pincode.trim()) {
      andConditions.push(
        Sequelize.where(
          Sequelize.cast(
            Sequelize.json("address.pincode"),
            "TEXT"
          ),
          {
            [Op.iLike]: `%${pincode.trim()}%`,
          }
        )
      );
    }

    if (place.trim()) {
      andConditions.push(
        Sequelize.where(
          Sequelize.cast(
            Sequelize.json("address.place"),
            "TEXT"
          ),
          {
            [Op.iLike]: `%${place.trim()}%`,
          }
        )
      );
    }

    if (country.trim()) {
      andConditions.push(
        Sequelize.where(
          Sequelize.cast(
            Sequelize.json("address.country"),
            "TEXT"
          ),
          {
            [Op.iLike]: `%${country.trim()}%`,
          }
        )
      );
    }

    if (state.trim()) {
      andConditions.push(
        Sequelize.where(
          Sequelize.cast(
            Sequelize.json("address.state"),
            "TEXT"
          ),
          {
            [Op.iLike]: `%${state.trim()}%`,
          }
        )
      );
    }

    if (district.trim()) {
      andConditions.push(
        Sequelize.where(
          Sequelize.cast(
            Sequelize.json("address.district"),
            "TEXT"
          ),
          {
            [Op.iLike]: `%${district.trim()}%`,
          }
        )
      );
    }

    // Global search
    if (search_query.trim()) {
      const search = search_query.trim();

      andConditions.push({
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } },
          { type: { [Op.iLike]: `%${search}%` } },
          Sequelize.where(
            Sequelize.cast(Sequelize.json("address.district"), "TEXT"),
            { [Op.iLike]: `%${search}%` }
          ),
          Sequelize.where(
            Sequelize.cast(Sequelize.json("address.place"), "TEXT"),
            { [Op.iLike]: `%${search}%` }
          ),
          Sequelize.where(
            Sequelize.cast(Sequelize.json("address.state"), "TEXT"),
            { [Op.iLike]: `%${search}%` }
          ),
          Sequelize.where(
            Sequelize.cast(Sequelize.json("address.country"), "TEXT"),
            { [Op.iLike]: `%${search}%` }
          ),
          Sequelize.where(
            Sequelize.cast(Sequelize.json("address.pincode"), "TEXT"),
            { [Op.iLike]: `%${search}%` }
          ),
        ],
      });
    }

    const whereClause =
      andConditions.length > 0
        ? { [Op.and]: andConditions }
        : {};

    // ---------- Distance & Ordering ----------
    let order: any = [["createdAt", "DESC"]]; // default
    let attributes: any = undefined;          // will be set only if lat/lng provided

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      // Haversine formula (distance in km)
      const distanceLiteral = Sequelize.literal(`
        6371 * acos(
          LEAST(
            GREATEST(
              cos(radians(${lat})) * cos(radians(latitude)) *
              cos(radians(longitude) - radians(${lng})) +
              sin(radians(${lat})) * sin(radians(latitude)),
              -1
            ),
            1
          )
        )
      `);

      attributes = {
        include: [
          [distanceLiteral, "distance"]
        ]
      };

      order = [[distanceLiteral, "ASC"]]; // nearest first
    }

    // ---------- Execute Query ----------
    const hospital = await Hospital.findAndCountAll({
      where: whereClause,
      attributes: attributes,          // undefined => all columns
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
      order: order,
    });

    // ---------- Pagination ----------
    const totalPages =
      Math.ceil(hospital.count / limitNum) || 1;

    // ---------- Response ----------
    res.status(200).json({
      success: true,
      data: hospital.rows,
      pagination: {
        totalItems: hospital.count,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
      error: null,
    });

    return;
  }
);

// GET BLACKLISTED - GET /hospital/blacklist
export const getBlacklistedHospitals: any = asyncHandler(async (req: Request, res: Response) => {
  const hospital = await Hospital.findAll({
    where: { isDelete: true }
  });

  if (hospital.length === 0) {
    res.status(404).json({
      success: false,
      message: "No blacklisted hospitals found",
      data: null,
      error: { code: "NO_DATA_FOUND", details: null },
    });
    return;
  }

  res.status(200).json({
    success: true,
    status: "Success",
    data: hospital,
    error: null,
  });
});

// RECOVER FROM BLACKLIST - PUT /hospital/recover/:id
export const recoverHospital: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const hospital = await Hospital.findOne({
    where: {
      id,
      isDelete: true,
    },
  });

  if (!hospital) {
    res.status(404).json({
      success: false,
      message: "Blacklisted hospital not found",
      data: null,
      error: { code: "HOSPITAL_NOT_FOUND", details: null },
    });
    return;
  }

  await hospital.update({
    isDelete: false,
    isActive: true,
    deleteDate: null,
    deleteRequested: false,
  });


  // update auth doctor


  const updatePayload = {
    isDelete: false,
    isActive: true,
    deleteDate: null,
  }
  try {
    await axios.put(
      `${process.env.AUTH_SERVICE_URL}/auth/${hospital.id}/role/${"hospital"}`,
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
      "Failed to update auth hospital:",
      error.response?.data || error.message
    );

    throw new Error(error.response?.data?.message || error.message || "Failed to update authentication hospital");
  }

  await publishEvent("hospital_events", "HOSPITAL_RECOVERED", {
    hospitalId: hospital.id,
    hospitalName: hospital.name,
  });

  res.status(200).json({
    success: true,
    message: "Hospital recovered successfully",
    data: hospital,
    error: null,
  });
});

// REFRESH TOKEN - POST /hospital/refresh
export const refreshHospitalToken: any = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    res.status(401).json({ success: false, message: "Refresh token missing" });
    return;
  }

  const jwtKey = process.env.JWT_SECRET;

  try {
    const decoded: any = jwt.verify(refreshToken, jwtKey);

    // Check Redis Blacklist / Rotation (REMOVED)

    const hospital = await Hospital.findByPk(decoded.id);

    if (!hospital) {
      res.status(401).json({ success: false, message: "Invalid refresh token" });
      return;
    }

    const newToken = jwt.sign({ id: hospital.id, name: hospital.name, role: "hospital", roleId: hospital.roleId, isRefresh: false }, jwtKey, {
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

// LOGOUT - POST /hospital/logout
export const logout: any = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId } = req.body;

  const hospital = await Hospital.findByPk(req.params.id);

  if (!hospital) {
    res.status(404).json({
      success: false,
      message: "Hospital not found",
    });
    return;
  }

  hospital.fcmToken = hospital.fcmToken.filter(
    (device: any) => device.deviceId !== deviceId
  );

  await hospital.save();

  // Redis Blacklist (REMOVED)
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    path: "/",
  });
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

export const roleBaseLogin: any = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const payload = req.body;

  const services = [
    `${process.env.HOSPITAL_SERVICE_URL}/hospital/login`,
    `${process.env.DOCTOR_SERVICE_URL}/doctor/login`,
    `${process.env.STAFF_SERVICE_URL}/staff/login`,
    `${process.env.USER_SERVICE_URL}/users/login`,
  ];

  for (const url of services) {
    try {
      const response = await axios.post(url, payload, {
        withCredentials: true,
      });

      const cookies = response.headers["set-cookie"];

      if (cookies) {
        res.setHeader("Set-Cookie", cookies);
      }

      // IMPORTANT: check service success
      if (response.data?.success) {
        res.status(200).json({
          success: true,
          roleDetected: url,
          token: response.data.token,
          data: response.data.data,
          error: null,
          authDefaultPermission: 1,
          authPermission: response.data.authPermission,
          hospitals: response.data.hospitals,
        });
        return;
      }
    } catch (err) {
      // ignore and try next service
    }
  }

  res.status(404).json({
    success: false,
    message: "User not found",
  });
  return;
});

export const roleBaseLogout: any = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id, deviceId, role } = req.body;

    if (!id || !deviceId || !role) {
      res.status(400).json({
        success: false,
        message: "id, role and deviceId are required",
      });
      return;
    }

    let url: string;

    switch (role.toLowerCase()) {
      case "hospital":
        url = `${process.env.HOSPITAL_SERVICE_URL}/hospital/logout/${id}`;
        break;

      case "doctor":
        url = `${process.env.DOCTOR_SERVICE_URL}/doctor/logout/${id}`;
        break;

      case "staff":
        url = `${process.env.STAFF_SERVICE_URL}/staff/logout/${id}`;
        break;

      case "user":
        url = `${process.env.USER_SERVICE_URL}/users/logout/${id}`;
        break;

      default:
        res.status(400).json({
          success: false,
          message: "Invalid role",
        });
        return;
    }

    try {
      const response = await axios.post(url, {
        deviceId,
      });

      res.status(response.status).json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json({
        success: false,
        message: error.response?.data?.message || "Logout failed",
      });
    }
  }
);

// UPDATE FCM TOKEN BY EMAIL - POST /hospital/update-fcm-token
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

  const hospital = await Hospital.findOne({ where: { email } });
  if (!hospital) {
    res.status(404).json({
      success: false,
      message: "Hospital not found",
      error: { code: "HOSPITAL_NOT_FOUND", details: null },
    });
    return;
  }

  const existingTokens: any[] = Array.isArray(hospital.fcmToken)
    ? hospital.fcmToken
    : [];

  const newTokens: any[] = Array.isArray(fcmToken)
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

  await hospital.update({
    fcmToken: updatedTokens,
  });

  res.status(200).json({
    success: true,
    message: "FCM token updated successfully",
    data: { id: hospital.id, fcmToken: updatedTokens },
    error: null,
  });
});
