import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { userService } from "../services/user.service";
import Patient from "../models/patient.model";
import PatientVitals from "../models/patientVitals.model";
import User from "../models/user.model";
import jwt from "jsonwebtoken";
import { generateToken, generateRefreshToken } from "../services/jwt.service";
import { publishEvent } from "../events/publisher";
import { Op, QueryTypes } from "sequelize";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

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


// --- USER CONTROLLERS ---

export const registerUser: any = asyncHandler(async (req: Request, res: Response) => {
  try {
    const data = await userService.register(req.body);
    res.status(201).json({ success: true, message: "User registered successfully", data });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message || "Server Error" });
  }
});

export const  loginUser: any = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { token, refreshToken, user } = await userService.login(req.body);
    setRefreshTokenCookie(res, refreshToken);
    res.status(200).json({ success: true, message: "Login success", token, data: user });
  } 
  catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message || "Server Error" });
  }
});

export const loginWithPhone: any = asyncHandler(async (req: Request, res: Response) => {
  try {
    const result = await userService.loginWithPhone(req.body.phone || "");
    res.status(200).json({ ...result, success: true, status: 200 });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message || "Failed to send OTP" });
  }
});

export const verifyOtp: any = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { token, refreshToken, user } = await userService.verifyOtp(req.body);
    setRefreshTokenCookie(res, refreshToken);
    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      token,
      fcmToken: user.fcmToken,
      userDetails: user,
      status: 200,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message || "Server error" });
  }
 
});

export const getUsers: any = asyncHandler(async (req: Request, res: Response) => {
  const users = await userService.getAllUsers();
  res.status(200).json({ success: true, data: users });
});

export const getBlacklistedUsers: any = asyncHandler(async (req: Request, res: Response) => {
  const users = await userService.getBlacklistedUsers();
  if (!users || users.length === 0) {
    res.status(404).json({ success: false, message: "No blacklisted users found" });
    return;
  }
  res.status(200).json({ success: true, data: users });
});

export const getUser: any = asyncHandler(async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
});

export const updateUser: any = asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = await userService.updateUser(req.params.id, req.body);
      res.status(200).json({ success: true, message: "User updated successfully", data: user });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, message: error.message });
    }
});

export const deleteUser: any = asyncHandler(async (req: Request, res: Response) => {
  try {
    await userService.deleteUser(req.params.id);
    res.status(200).json({ success: true, message: "User deleted" });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
});

// export const resetPassword: any = asyncHandler(async (req: Request, res: Response) => {
//   try {
//     await userService.resetPassword(req.body);
//     res.status(200).json({ success: true, message: "Password reset successful" });
//   } catch (error: any) {
//     res.status(error.status || 500).json({ success: false, message: error.message });
//   }
// });

export const sendOtpEmail: any = asyncHandler(async (req: Request, res: Response) => {
  try {
    const result = await userService.sendOtpByEmail(req.body.email);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
});

export const verifyOtpEmail: any = asyncHandler(async (req: Request, res: Response) => {
  try {
    const result = await userService.verifyOtpEmail(req.body);
    if (result.refreshToken) setRefreshTokenCookie(res, result.refreshToken);
    res.status(200).json({ success: true, message: "OTP verified", ...result });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
});

// export const resetPasswordEmail: any = asyncHandler(async (req: Request, res: Response) => {
//   try {
//     const result = await userService.resetPasswordWithEmail(req.body);
//     res.status(200).json(result);
//   } catch (error: any) {
//     res.status(error.status || 500).json({ success: false, message: error.message });
//   }
// });


// export const resetPasswordEmail: any = asyncHandler(async (req: any, res: Response) => {
//   const result = await userService.resetPasswordWithEmail(
//     req.user.id,
//     req.body
//   );

//   res.json(result);
// });
// In user.controller.ts
export const resetPasswordEmail: any = asyncHandler(async (req: Request, res: Response) => {
  const { email, newPassword } = req.body;   // from validated body
  const result = await userService.resetPasswordByEmail({ email, newPassword });
  res.json(result);
});

export const changePassword: any = asyncHandler(async (req: any, res: Response) => {
  try {
    const result = await userService.changePassword(req.user.id, req.body);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
});

export const saveExpoToken: any = asyncHandler(async (req: Request, res: Response) => {
  try {
    const user = await userService.saveExpoToken(req.params.id, req.body.expoPushToken);
    res.status(200).json({ success: true, message: "Expo token updated", user });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
});


export const testPushNotification: any = asyncHandler(async (req: Request, res: Response) => {
  try {
    const result = await userService.testPushNotification(req.params.id);
    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
});


// --- PATIENT CONTROLLERS ---

// CREATE PATIENT
export const createPatient: any = asyncHandler(async (req: Request, res: Response) => {
  const t = await Patient.sequelize!.transaction();

  try {
    // 1. Extract Patient Info
    const {
      name, bloodGroup, gender, maritalStatus,roleId,
      patientType, age, dob, mobileNumber, emergencyNumber,
      guardianName, addressLine, location, email, password, userId, hospitalId,hospitalName
    } = req.body;



    // 3. Handle User association conditions
    let finalUserId = userId;

    if (finalUserId) {
      // Condition 1: userId is provided in body
      const userExists = await User.findOne({ where: { id: finalUserId, isDelete: false } });
      if (!userExists) {
        res.status(400).json({ success: false, message: `User with ID ${finalUserId} does not exist.` });
        return;
      }
    } else {
      // Condition 3: Search existing user by phone (mobileNumber)
      const existingUser = await User.findOne({ where: { phone: mobileNumber } });
      if (existingUser) {
        finalUserId = existingUser.id;
      } else {
        // Condition 2: Create new User automatically
        const userEmail = email || null;
        
        let existingUserByEmail = null;
        if (userEmail) {
          existingUserByEmail = await User.findOne({ where: { email: userEmail } });
        }

        if (existingUserByEmail) {
          finalUserId = existingUserByEmail.id;
        } else {
          const newUser = await User.create({
            name: name || mobileNumber,
            email: userEmail,
            phone: mobileNumber,
            roleId: roleId || 5 // Default patient role
          }, { transaction: t });
          
          finalUserId = newUser.id;

          // Publish USER_REGISTERED event
          try {
            await publishEvent("user_events", "USER_REGISTERED", {
              userId: newUser.id,
              email: newUser.email,
              roleId: newUser.roleId,
              name,
            });
          } catch (err) {
            console.error("Failed to publish USER_REGISTERED event for auto-created user:", err);
          }
        }
      }
    }

    // 4. Generate hospital-scoped patientNumber
    const [lastResult]: any = await Patient.sequelize!.query(
      `SELECT COALESCE(MAX("patientNumber"), 0) AS "maxNum" FROM "patients" WHERE "hospitalId" = :hospitalId`,
      {
        replacements: { hospitalId },
        type: QueryTypes.SELECT,
        transaction: t,
      }
    );
    const patientNumber = (lastResult?.maxNum || 0) + 1;

    // 5. Create Patient
    const patient = await Patient.create({
      name, bloodGroup, gender, maritalStatus,
      patientType, age, dob, mobileNumber, emergencyNumber,
      guardianName, addressLine, location, email, password, userId: finalUserId, hospitalId, hospitalName,
      patientNumber,
    }, { transaction: t });


    await t.commit();

    // Fetch the stored patient with vitals + user to return
    const result = await Patient.findByPk(patient.id, {
      include: [
        { model: PatientVitals, as: "vitals" },
        { model: User, as: "user", attributes: ["id", "name", "email", "phone"] },
      ],
    });

    try {
      await publishEvent("patient_events", "PATIENT_REGISTERED", {
        patientId: result?.id,
        userId: finalUserId,
        hospitalId: hospitalId,
        patientName: name,
        phone: mobileNumber
      });
    } catch (err) {
      console.error("Failed to publish PATIENT_REGISTERED event:", err);
    }

    res.status(201).json({
      success: true,
      message: "Patient created successfully",
      data: result,
    });
  } catch (error: any) {
    await t.rollback();
    console.error("🔥 Error in createPatient controller:", error);
    
    if (error.name === "SequelizeValidationError") {
      const messages = error.errors?.map((e: any) => `${e.path}: ${e.message}`) || [error.message];
      res.status(400).json({
        success: false,
        message: "Validation failed: " + messages.join(", "),
        error: { code: "VALIDATION_ERROR", details: error.errors },
      });
      return;
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      const field = error.errors?.[0]?.path || "field";
      res.status(409).json({
        success: false,
        message: `Duplicate entry: ${field} already exists`,
        error: { code: "DUPLICATE_ENTRY", details: field },
      });
      return;
    }

    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to create patient",
      error: error.stack || null,
    });
  }
});


// GET ALL PATIENTS


export const getPatients = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  let {
    name,
    patientId,
    addressLine,
    hospitalId,
    email,
    guardianName,
    userId,
    page = 1,
    limit = 10,
    search_query,
  }: any = req.query;

  // Normalize arrays
  const extract = (val: any) => (Array.isArray(val) ? val[0] : val);

  name = extract(name);
  patientId = extract(patientId);
  addressLine = extract(addressLine);
  hospitalId = extract(hospitalId);
  email = extract(email);
  guardianName = extract(guardianName);
  page = extract(page);
  limit = extract(limit);
  search_query = extract(search_query);
   userId = extract(userId);

  const pageNum = Number(page);
  const limitNum = Number(limit);

  // const whereCondition: any = {
  //   isDelete: false,
  // };

  const whereCondition: any = {};
  

  // Field filters
  if (name) {
    whereCondition.name = {
      [Op.iLike]: `%${name}%`,
    };
  }

  if (hospitalId !== undefined) {
    whereCondition.hospitalId = Number(hospitalId);
  }

  if (userId !== undefined) {
    whereCondition.userId = Number(userId);
  }


  if (patientId) {
    whereCondition.patientId = {
      [Op.iLike]: `%${patientId}%`,
    };
  }

  if (addressLine) {
    whereCondition.addressLine = {
      [Op.iLike]: `%${addressLine}%`,
    };
  }

  if (email) {
    whereCondition.email = {
      [Op.iLike]: `%${email}%`,
    };
  }

  if (guardianName) {
    whereCondition.guardianName = {
      [Op.iLike]: `%${guardianName}%`,
    };
  }


  

  // Global search (kept separate)
  if (search_query) {
    whereCondition[Op.or] = [
      { name: { [Op.iLike]: `%${search_query}%` } },
      { addressLine: { [Op.iLike]: `%${search_query}%` } },
      { email: { [Op.iLike]: `%${search_query}%` } },
      { mobileNumber: { [Op.iLike]: `%${search_query}%` } },
      { guardianName: { [Op.iLike]: `%${search_query}%` } },
    ];
  }

  const patients = await Patient.findAndCountAll({
    where: whereCondition,
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
    order: [["createdAt", "DESC"]],
  });

  const totalPages = Math.ceil(patients.count / limitNum);

  res.status(200).json({
    success: true,
    data: patients.rows,
    pagination: {
      totalItems: patients.count,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPreviousPage: pageNum > 1,
    },
    error: null,
  });
   return;
});


// GET BLACKLISTED PATIENTS
export const getBlacklistedPatients: any = asyncHandler(async (req: Request, res: Response) => {
  const patients = await Patient.findAll({
    where: { isDelete: true },
    include: [
      { model: PatientVitals, as: "vitals", limit: 1, order: [["createdAt", "DESC"]] },
      { model: User, as: "user", attributes: ["id", "name", "email", "phone"] },
    ],
  });

  if (patients.length === 0) {
    res.status(404).json({
      success: false,
      message: "No blacklisted patients found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: patients,
  });
});

// GET ONE PATIENT (with all vitals history)
export const getPatient: any = asyncHandler(async (req: Request, res: Response) => {
  const patient = await Patient.findOne({
    where: { id: req.params.id, isDelete: false },
    include: [
      { model: PatientVitals, as: "vitals", order: [["createdAt", "DESC"]] },
      { model: User, as: "user", attributes: ["id", "name", "email", "phone"] },
    ],
  });

  if (!patient) {
    res.status(404).json({
      success: false,
      message: "Patient not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: patient,
  });
});

// UPDATE PATIENT (Allows updating profile + recording new vitals)
export const updatePatient: any = asyncHandler(async (req: Request, res: Response) => {
  const t = await Patient.sequelize!.transaction();
  
  try {
    const patient = await Patient.findOne({ where: { id: req.params.id, isDelete: false } });

    if (!patient) {
      res.status(404).json({ success: false, message: "Patient not found" });
      return;
    }

    // 1. Update Patient Profile Fields
    const {
      name, bloodGroup, gender, maritalStatus,
      patientType, age, dob, mobileNumber, emergencyNumber,
      guardianName, addressLine, location, email, password, userId, hospitalId,hospitalName
    } = req.body;

    // 1.5 Validate userId (if provided)
    if (userId) {
      const userExists = await User.findOne({ where: { id: userId, isDelete: false } });
      if (!userExists) {
        res.status(400).json({ success: false, message: `User with ID ${userId} does not exist.` });
        return;
      }
    }

    await patient.update({
      name, bloodGroup, gender, maritalStatus,
      patientType, age, dob, mobileNumber, emergencyNumber,
      guardianName, addressLine, location, email, password, userId, hospitalId,hospitalName
    }, { transaction: t });

    await t.commit();

    // 3. Return updated patient with fresh vitals + user
    const result = await Patient.findByPk(patient.id, {
      include: [
        { model: PatientVitals, as: "vitals", limit: 1, order: [["createdAt", "DESC"]] },
        { model: User, as: "user", attributes: ["id", "name", "email", "phone"] },
      ],
    });

    res.status(200).json({
      success: true,
      message: "Patient record updated successfully",
      data: result,
    });

    try {
      await publishEvent("patient_events", "PATIENT_UPDATED", {
        patientId: patient.id,
        userId: patient.userId || null,
        hospitalId: patient.hospitalId,
        patientName: `${name || patient.name} `,
      });
    } catch (err) {
      console.error("Failed to publish PATIENT_UPDATED event:", err);
    }
  } catch (error: any) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message || "Failed to update patient" });
  }
});


// DELETE PATIENT
export const deletePatient: any = asyncHandler(async (req: Request, res: Response) => {
  const patient = await Patient.findOne({ where: { id: req.params.id, isDelete: false } });

  if (!patient) {
    res.status(404).json({ success: false, message: "Patient not found" });
    return;
  }

  // 🔥 Move to blacklist (soft delete)
  await patient.update({
    isActive: false,
    isDelete: true,
    deleteDate: new Date(),
  });

  res.status(200).json({
    success: true,
    message: "Patient moved to blacklist",
  });

  try {
    await publishEvent("patient_events", "PATIENT_DELETED", {
      patientId: patient.id,
      userId: patient.userId || null,
      hospitalId: patient.hospitalId,
    });
  } catch (err) {
    console.error("Failed to publish PATIENT_DELETED event:", err);
  }
});

// RECOVER USER FROM BLACKLIST - PUT /users/recover/:id
export const recoverUser: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await userService.recoverUser(id);

  res.status(200).json({
    success: true,
    message: "User recovered successfully",
    data: user,
    error: null,
  });
});

// RECOVER PATIENT FROM BLACKLIST - PUT /patients/recover/:id
export const recoverPatient: any = asyncHandler(async (req: Request, res: Response) => {
  const patient = await Patient.findOne({ where: { id: req.params.id, isDelete: true } });

  if (!patient) {
    res.status(404).json({ success: false, message: "Blacklisted patient not found" });
    return;
  }

  await patient.update({
    isActive: true,
    isDelete: false,
    deleteDate: null,
  });

  try {
    await publishEvent("patient_events", "PATIENT_RECOVERED", {
      patientId: patient.id,
      userId: patient.userId || null,
      hospitalId: patient.hospitalId,
    });
  } catch (err) {
    console.error("Failed to publish PATIENT_RECOVERED event:", err);
  }

  res.status(200).json({
    success: true,
    message: "Patient recovered successfully",
    data: patient,
  });
});

import { env } from "../config/env";

// REFRESH TOKEN - POST /users/refresh
export const refreshUserToken: any = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    res.status(401).json({ success: false, message: "Refresh token missing" });
    return;
  }

  const jwtKey = env.JWT_SECRET || "supersecretjwtkey";

  try {
    const decoded: any = jwt.verify(refreshToken, jwtKey);
    const user = await User.findOne({ where: { id: decoded.id, isDelete: false } });

    if (!user) {
      res.status(401).json({ success: false, message: "Invalid refresh token" });
      return;
    }

    const newToken = generateToken({ id: user.id, email: user.email, role: "user", roleId: user.roleId });
    const newRefreshToken = generateRefreshToken({ id: user.id, email: user.email, role: "user", roleId: user.roleId });

    setRefreshTokenCookie(res, newRefreshToken);

    res.status(200).json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
  }
});

// LOGOUT - POST /users/logout
export const logout: any = asyncHandler(async (req: Request, res: Response) : Promise<void> => {

const { deviceId } = req.body;

const user = await User.findByPk(req.params.id);

if (!user) {
   res.status(404).json({
    success: false,
    message: "User not found",
  });
  return;
}

user.fcmToken = user.fcmToken.filter(
  (device: any) => device.deviceId !== deviceId
);

await user.save();


    
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

// SAVE FCM TOKEN - POST /users/:id/fcm-token
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

  const user = await User.findByPk(id);
  if (!user) {
    res.status(404).json({
      success: false,
      message: "User not found",
      error: { code: "USER_NOT_FOUND", details: null },
    });
    return;
  }

  const parseToken = (token: any): any => {
    let parsed = token;
    while (typeof parsed === 'string') {
      try {
        const next = JSON.parse(parsed);
        if (next === parsed) break;
        parsed = next;
      } catch {
        break;
      }
    }
    return parsed;
  };

  const existingRaw = (user.get("fcmToken") as any[]) || [];
  const existingTokens = Array.isArray(existingRaw) ? existingRaw.map(parseToken) : [];

  const newRaw = Array.isArray(fcmToken) ? fcmToken : [fcmToken];
  const newTokens = newRaw.map(parseToken);

  const updatedTokens = [
    ...existingTokens.filter(
      (oldToken) => !newTokens.some((newToken) => newToken.deviceId === oldToken.deviceId)
    ),
    ...newTokens,
  ];

  await user.update({ fcmToken: updatedTokens });

  res.status(200).json({
    success: true,
    message: "FCM token saved successfully",
    data: { id: user.id, fcmToken: user.fcmToken },
    error: null,
  });
});





export const sendEnquiry = asyncHandler(
  async (req: Request, res: Response) : Promise<void>  => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
       res.status(400).json({
        success: false,
        message: "Name, email, subject and message are required.",
      });
      return;
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: Number(587),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Website Enquiry" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,

      // When company clicks Reply, it goes to the user's email
      replyTo: email,

      subject: `New Enquiry - ${subject}`,

      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">

        <table width="650" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:12px;overflow:hidden;
          box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td
              style="background:linear-gradient(135deg,#0d6efd,#0a58ca);
              color:white;padding:30px;">

              <h1 style="margin:0;font-size:24px;">
                New Enquiry Received
              </h1>

              <p style="margin-top:10px;opacity:.9;">
                A new enquiry has been submitted through your website.
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:30px;">

              <table width="100%" cellpadding="12" cellspacing="0"
                style="border-collapse:collapse;">

                <tr>
                  <td style="font-weight:bold;width:150px;">
                    Name
                  </td>
                  <td>${name}</td>
                </tr>

                <tr style="background:#f8fafc;">
                  <td style="font-weight:bold;">
                    Email
                  </td>
                  <td>
                    <a href="mailto:${email}">
                      ${email}
                    </a>
                  </td>
                </tr>

                <tr>
                  <td style="font-weight:bold;">
                    Subject
                  </td>
                  <td>${subject}</td>
                </tr>

              </table>

              <div
                style="
                  margin-top:30px;
                  background:#f8fafc;
                  border-left:5px solid #0d6efd;
                  padding:20px;
                  border-radius:8px;
                "
              >
                <h3 style="margin-top:0;">
                  Message
                </h3>

                <p
                  style="
                    line-height:1.7;
                    margin:0;
                    white-space:pre-wrap;
                  "
                >
                  ${message}
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td
              style="
                background:#f8fafc;
                text-align:center;
                padding:20px;
                color:#64748b;
                font-size:13px;
              "
            >
              This email was generated automatically from your website enquiry form.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`
      
    });

    res.status(200).json({
      success: true,
      message: "Enquiry submitted successfully.",
    });
    return;
  }
);


