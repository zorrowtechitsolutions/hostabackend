

import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import Auth from "../models/auth.model";
import { Op } from "sequelize";
import twilio from "twilio";
import axios from "axios";
import { sendEmail } from "../services/mail.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { createAuditLog, updateAuditLogOnLogout } from "../services/audit.service";

const APPLE_TEST_NUMBER = "9999999999";
const APPLE_TEST_OTP = "123456";

interface FCMTOKEN {
  deviceId: string;
  fcmToken: string;
  platform: "android" | "ios" | "web";
}




// Helper to set refresh token cookie
const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 14 * 24 * 60 * 60 * 1000, // 2 weeks
    path: "/",
  });
};





const getTwilioClient = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    return null;
  }
  return twilio(sid, token);
};

export const sendOtpEmail = async (email: string, otp: string, userName: string = "User") => {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
      <div style="background-color: #007bff; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: 1px;">Hosta Hospital</h1>
      </div>
      <div style="padding: 40px; background-color: #ffffff;">
        <h2 style="color: #333; margin-top: 0;">Verification Code</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">Use the following security code to complete your login. This code is valid for <strong>10 minutes</strong>.</p>
        
        <div style="text-align: center; margin: 40px 0;">
          <div style="display: inline-block; background-color: #f8f9fa; border: 2px dashed #007bff; border-radius: 8px; padding: 20px 40px; font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 8px;">
            ${otp}
          </div>
        </div>
        
        <p style="color: #999; font-size: 14px; line-height: 1.5; border-top: 1px solid #eee; padding-top: 20px;">
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

/**
 * Fetch the related profile from the corresponding microservice based on role.
 * e.g. role=hospital → GET hospital-service/hospital/:id
 *      role=staff    → GET staff-service/staff/:id
 *      role=doctor   → GET doctor-service/doctor/:id
 */
const fetchRelatedProfile = async (user: any): Promise<any> => {
  let profileData = null;

  try {
    const role = user.role;
    let serviceUrl = "";
    let entityId: number | null = null;

    switch (role) {
      case "hospital":
      case "admin":
      case "hospital_admin":
        serviceUrl = process.env.HOSPITAL_SERVICE_URL || "";
        entityId = user.hospitalId || user.id;
        if (serviceUrl && entityId) {
          const res = await axios.get(`${serviceUrl}/hospital/${entityId}`, {
            timeout: 3000, // 3 seconds timeout
          });
          profileData = res.data?.data || res.data;
        }
        break;

      case "staff":
        serviceUrl = process.env.STAFF_SERVICE_URL || "";
        entityId = user.staffId;
        if (serviceUrl && entityId) {
          const res = await axios.get(`${serviceUrl}/staff/internal/${entityId}`, {
            timeout: 3000,
            headers: {
              "x-service-secret": process.env.INTERNAL_SERVICE_SECRET,
            },
          });
          profileData = res.data?.data || res.data;
        }
        break;

      case "doctor":
        serviceUrl = process.env.DOCTOR_SERVICE_URL || "";
        entityId = user.doctorId;
        if (serviceUrl && entityId) {
          const res = await axios.get(`${serviceUrl}/doctor/internal/${entityId}`, {
            timeout: 3000,
            headers: {
              "x-service-secret": process.env.INTERNAL_SERVICE_SECRET,
            },
          });
          profileData = res.data?.data || res.data;
        }
        break;

      case "superadmin":
        // Superadmin profile lives in the auth table itself
        profileData = null;
        break;

      default:
        break;
    }
  } catch (err: any) {
    console.error(`Failed to fetch ${user.role} profile:`, err.message);
  }

  return profileData;
};

/**
 * Fetch role-based permissions from the role-service.
 */
const fetchRolePermissions = async (
  roleId: number | undefined,
  hospitalId: number | undefined,
  role: string | undefined
): Promise<any> => {
  if (!roleId) return null;

  try {
    console.log(role, roleId, hospitalId, "auyhfbnmdfghjk");

    const res = await axios.get(`${process.env.ROLE_SERVICE_URL}/rolepermission`, {
      timeout: 3000,
      params:
        role === "doctor" || role === "staff"
          ? {
              roleId,
              hospitalId,
            }
          : {
              roleId,
            },
    });
    console.log(res.data, "hiii");

    return res.data;
  } catch (err: any) {
    console.error("Failed to fetch role permissions:", err.message);
    return null;
  }
};

/**
 * Update FCM token in the respective service based on role.
 * This will call the doctor/hospital/staff service to update their FCM token.
 */
const updateFCMTokenInService = async (
  role: string,
  entityId: number,
  email: string,
  fcmToken: any
): Promise<void> => {
  try {
    let serviceUrl = "";
    let endpoint = "";

    switch (role) {
      case "hospital":
        serviceUrl = process.env.HOSPITAL_SERVICE_URL || "";
        endpoint = `${serviceUrl}/hospital/update-fcm-token`;
        break;
      case "staff":
        serviceUrl = process.env.STAFF_SERVICE_URL || "";
        endpoint = `${serviceUrl}/staff/update-fcm-token`;
        break;
      case "doctor":
        serviceUrl = process.env.DOCTOR_SERVICE_URL || "";
        endpoint = `${serviceUrl}/doctor/update-fcm-token`;
        break;
      default:
        console.log(`FCM token update not supported for role: ${role}`);
        return;
    }

    if (!serviceUrl) {
      console.log(`Service URL not configured for role: ${role}`);
      return;
    }

    await axios.post(
      endpoint,
      {
        email,
        fcmToken,
      },
      {
        timeout: 3000,
      }
    );

    console.log(`FCM token updated successfully for ${role} with email: ${email}`);
  } catch (err: any) {
    console.error(`Failed to update FCM token for ${role}:`, err.message);
  }
};

const verifyMembershipStatus = async (
  role: string,
  roleId: number | undefined,
  hospitalId: number | undefined
): Promise<boolean> => {
  if (!roleId || !hospitalId) {
    return false;
  }

  try {
    let isActive = false;

    if (role === "doctor") {
      const resHosp = await axios.get(
        `${process.env.DOCTOR_SERVICE_URL}/doctor/internal/${roleId}/hospitals`,
        {
          headers: { "x-service-secret": process.env.INTERNAL_SERVICE_SECRET },
          timeout: 3000,
        }
      );
      const memberships = resHosp.data?.data || [];
      const chosen = memberships.find((m: any) => m.hospitalId === hospitalId);
      if (chosen && chosen.status === "ACTIVE") isActive = true;
    } else if (role === "staff") {
      const resHosp = await axios.get(
        `${process.env.STAFF_SERVICE_URL}/staff/internal/${roleId}/hospitals`,
        {
          headers: { "x-service-secret": process.env.INTERNAL_SERVICE_SECRET },
          timeout: 3000,
        }
      );
      const memberships = resHosp.data?.data || [];
      const chosen = memberships.find((m: any) => m.hospitalId === hospitalId);
      if (chosen && chosen.status === "ACTIVE") isActive = true;
    } else {
      isActive = true;
    }

    return isActive;
  } catch (err: any) {
    console.error("Failed to verify membership status:", err.message);
    return false;
  }
};

export const selectHospital: any = asyncHandler(async (req: Request, res: Response) => {
  const decoded: any = (req as any).user;
  const { hospitalId } = req.body;

  if (!decoded || !decoded.isSelectionToken) {
    res.status(401).json({ success: false, message: "Invalid or missing selection token" });
    return;
  }

  const selectedHospitalId = Number(hospitalId);
  if (Number.isNaN(selectedHospitalId)) {
    res.status(400).json({ success: false, message: "Invalid hospitalId" });
    return;
  }

  const availableHospitalIds = Array.isArray(decoded.availableHospitalIds)
    ? decoded.availableHospitalIds.map((id: any) => Number(id))
    : [];

  if (!availableHospitalIds.includes(selectedHospitalId)) {
    res.status(403).json({ success: false, message: "Not authorized for this hospital" });
    return;
  }

  const authUser = await Auth.findByPk(decoded.authId);
  if (!authUser) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  // const isActive = await verifyMembershipStatus(decoded.userType || decoded.role, decoded.userType === 'doctor' ? authUser.doctorId : authUser.staffId, selectedHospitalId);
  const effectiveRole = decoded.userType || decoded.role;

const entityId =
  effectiveRole === "doctor"
    ? authUser.doctorId
    : effectiveRole === "staff"
      ? authUser.staffId
      : undefined;

const isActive = await verifyMembershipStatus(
  effectiveRole,
  entityId,
  selectedHospitalId
);


  if (!isActive) {
    res.status(403).json({ success: false, message: "Hospital membership is not active" });
    return;
  }

  const jwtKey = process.env.JWT_SECRET || "supersecretjwtkey";
  const tokenPayload = {
    id: authUser.id,
    name: authUser.role === 'doctor' ? authUser.doctorName : authUser.role === 'staff' ? authUser.staffName : authUser.hospitalName || '',
    role: authUser.role,
    roleId: authUser.roleId,
    hospitalId: selectedHospitalId,
    staffId: authUser.staffId,
    doctorId: authUser.doctorId,
    superadminId: authUser.superadminId,
    userType: authUser.role,
  };

  const token = jwt.sign({ ...tokenPayload, isRefresh: false }, jwtKey, { expiresIn: "1d" });
  const refreshToken = jwt.sign({ ...tokenPayload, isRefresh: true }, jwtKey, { expiresIn: '2w' });
  setRefreshTokenCookie(res, refreshToken);

  const safeUser = authUser.toJSON();
  delete safeUser.password;
  delete safeUser.otp;
  delete safeUser.otpExpiry;

  res.status(200).json({
    success: true,
    message: 'Hospital selected successfully',
    token,
    data: safeUser,
  });
});



export const toggleNotificationStatus: any = asyncHandler(async (req: Request, res: Response) => {
  const decoded: any = (req as any).user;
  
  if (!decoded || !decoded.id) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const user = await Auth.findByPk(decoded.id);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  // Toggle the current status
  const currentStatus = user.notificationEnabled !== undefined ? user.notificationEnabled : true;
  user.notificationEnabled = !currentStatus;
  
  await user.save();

  res.status(200).json({
    success: true,
    message: `Notifications have been ${user.notificationEnabled ? 'enabled' : 'disabled'}.`,
    notificationEnabled: user.notificationEnabled
  });
});




// ===================== LOGIN (Email/Password) =====================

export const login: any = asyncHandler(async (req: Request, res: Response) => {
  console.log("========== LOGIN REQUEST ==========");
  console.log(req.body);
  console.log("typeof fcmToken:", typeof req.body.fcmToken);
  console.log("fcmToken:", req.body.fcmToken);
  console.log("========== LOGIN REQUEST ==========");

  const { email, phone, password, fcmToken, hospitalId } = req.body;

  // 1. Validate input
  if ((!email && !phone) || !password) {
    res.status(400).json({
      success: false,
      message: "Identifier (email/phone) and password are required",
    });
    return;
  }

  // 2. Find matching auth records. Staff/doctor email and phone can repeat across hospitals.
  const users = await Auth.scope("withPassword").findAll({
    where: {
      [Op.or]: [email ? { email } : null, phone ? { phone } : null].filter(Boolean) as any,
    },
  });

  if (!users.length) {
    await createAuditLog({ req, name: email || phone || 'Unknown', role: 'Unknown', status: 'Failed', riskLevel: 'High' });
    res.status(401).json({
      success: false,
      message: "User not found! Please register",
      data: null,
      error: { code: "USER_NOT_FOUND", details: null },
    });
    return;
  }

  const activeUsers = users.filter((user) => user.isDelete !== true && user.isActive !== false);

  if (!activeUsers.length) {
    await createAuditLog({ req, name: email || phone || 'Unknown', role: 'Unknown', status: 'Failed', riskLevel: 'High' });
    res.status(401).json({
      success: false,
      message: "User account has been deactivated or deleted.",
      data: null,
      error: { code: "USER_BLACKLISTED", details: null },
    });
    return;
  }

  const matchedUsers = [];

  for (const authUser of activeUsers) {
    const validPassword = await bcrypt.compare(password, authUser.password || "");
    if (validPassword) {
      matchedUsers.push(authUser);
    }
  }

  if (!matchedUsers.length) {
    await createAuditLog({ req, name: email || phone || 'Unknown', role: 'Unknown', status: 'Failed', riskLevel: 'High' });
    res.status(401).json({ success: false, message: "Wrong password", data: null, error: { code: "WRONG_PASSWORD" } });
    return;
  }

  if (matchedUsers.length > 1 && !hospitalId) {
    res.status(200).json({
      success: true,
      requireHospitalSelection: true,
      hospitals: matchedUsers.map((authUser) => ({
        authId: authUser.id,
        role: authUser.role,
        staffId: authUser.staffId,
        doctorId: authUser.doctorId,
        hospitalId: authUser.hospitalId,
        hospitalName: authUser.hospitalName,
      })),
    });
    return;
  }

  const user = hospitalId
    ? matchedUsers.find((authUser) => Number(authUser.hospitalId) === Number(hospitalId))
    : matchedUsers[0];

  if (!user) {
    res.status(403).json({ success: false, message: 'No active user for selected hospital' });
    return;
  }

  if (user.isDelete === true || user.isActive === false) {
    await createAuditLog({ req, authId: user.id, name: user.doctorName || user.staffName || user.hospitalName || 'Unknown', role: user.role, status: 'Failed', riskLevel: 'High' });
    res.status(401).json({
      success: false,
      message: "User account has been deactivated or deleted.",
      data: null,
      error: { code: "USER_BLACKLISTED", details: null },
    });
    return;
  }

  // 4. For doctor/staff, fetch hospital memberships via the respective service
  let selectedUser: any = user;
  if (user.role === 'doctor') {
    try {
      const resHosp = await axios.get(`${process.env.DOCTOR_SERVICE_URL}/doctor/internal/${user.doctorId}/hospitals`, {
        headers: { 'x-service-secret': process.env.INTERNAL_SERVICE_SECRET },
        timeout: 3000,
      });
      const memberships = resHosp.data?.data || [];

      if (memberships.length > 1 && !hospitalId) {
        const hospitals = memberships.map((m: any) => ({ hospitalId: m.hospitalId, status: m.status, joinedAt: m.joinedAt, leftAt: m.leftAt }));
        const jwtKey = process.env.JWT_SECRET || "supersecretjwtkey";
        const tempToken = jwt.sign(
          {
            authId: user.id,
            userType: user.role,
            availableHospitalIds: hospitals.map((h: any) => h.hospitalId),
            isSelectionToken: true,
          },
          jwtKey,
          { expiresIn: "5m" }
        );
        res.status(200).json({ success: true, requiresHospitalSelection: true, token: tempToken, user: { authId: user.id, role: user.role, name: user.doctorName || user.staffName || user.hospitalName }, hospitals });
        return;
      }

      if (hospitalId) {
        // const chosen = memberships.find((m: any) => m.hospitalId === parseInt(hospitalId));
        const chosen = memberships.find(
  (m: any) => Number(m.hospitalId) === Number(hospitalId)
);

        if (!chosen || chosen.status !== 'ACTIVE') {
          res.status(403).json({ success: false, message: 'No active membership for selected hospital' });
          return;
        }
        (selectedUser as any).hospitalId = chosen.hospitalId;
      } else if (memberships.length === 1) {
        const singleMembership = memberships[0];
        if (singleMembership.status !== 'ACTIVE') {
          res.status(403).json({ success: false, message: 'No active membership for the only linked hospital' });
          return;
        }
        (selectedUser as any).hospitalId = singleMembership.hospitalId;
      }
    } catch (err: any) {
      console.error('Failed to fetch doctor memberships:', err.message);
    }
  }

  if (user.role === 'staff') {
    try {
      const resHosp = await axios.get(`${process.env.STAFF_SERVICE_URL}/staff/internal/${user.staffId}/hospitals`, {
        headers: { 'x-service-secret': process.env.INTERNAL_SERVICE_SECRET },
        timeout: 3000,
      });
      const memberships = resHosp.data?.data || [];

      if (memberships.length > 1 && !hospitalId) {
        const hospitals = memberships.map((m: any) => ({ hospitalId: m.hospitalId, status: m.status, joinedAt: m.joinedAt, leftAt: m.leftAt }));
        const jwtKey = process.env.JWT_SECRET || "supersecretjwtkey";
        const tempToken = jwt.sign(
          {
            authId: user.id,
            userType: user.role,
            availableHospitalIds: hospitals.map((h: any) => h.hospitalId),
            isSelectionToken: true,
          },
          jwtKey,
          { expiresIn: "5m" }
        );
        res.status(200).json({ success: true, requiresHospitalSelection: true, token: tempToken, user: { authId: user.id, role: user.role, name: user.doctorName || user.staffName || user.hospitalName }, hospitals });
        return;
      }

      if (hospitalId) {
        const chosen = memberships.find((m: any) => m.hospitalId === parseInt(hospitalId));
        if (!chosen || chosen.status !== 'ACTIVE') {
          res.status(403).json({ success: false, message: 'No active membership for selected hospital' });
          return;
        }
        (selectedUser as any).hospitalId = chosen.hospitalId;
      } else if (memberships.length === 1) {
        const singleMembership = memberships[0];
        if (singleMembership.status !== 'ACTIVE') {
          res.status(403).json({ success: false, message: 'No active membership for the only linked hospital' });
          return;
        }
        (selectedUser as any).hospitalId = singleMembership.hospitalId;
      }
    } catch (err: any) {
      console.error('Failed to fetch staff memberships:', err.message);
    }
  }

  // At this point we have a single selectedUser
  const authUser = selectedUser;

  // 7. Update FCM token
  if (fcmToken) {
    const fieldName = `${authUser.role}_fcmtoken` as keyof typeof authUser;

    // Helper to parse a token if it's a string
    const parseToken = (token: any): any => {
      if (typeof token === "string") {
        try {
          return JSON.parse(token);
        } catch {
          // If parsing fails, return as-is (or skip)
          return token;
        }
      }
      return token;
    };

    // Read existing tokens and ensure they are all objects
    const existingRaw = authUser[fieldName] || [];
    const existingTokens = Array.isArray(existingRaw) ? existingRaw.map(parseToken) : [];

    // Ensure new token(s) are objects
    const newRaw = Array.isArray(fcmToken) ? fcmToken : [fcmToken];
    const newTokens = newRaw.map(parseToken);

    // Merge, removing duplicates by deviceId
    const updatedTokens = [
      ...existingTokens.filter(
        (oldToken) => !newTokens.some((newToken) => newToken.deviceId === oldToken.deviceId)
      ),
      ...newTokens,
    ];

    await authUser.update({
      [fieldName]: updatedTokens,
    });
  }

  // 8. Generate tokens
  const jwtKey = process.env.JWT_SECRET || "supersecretjwtkey";

  // Determine the name based on the role
  let userName = "";
  if (authUser.role === "doctor") userName = authUser.doctorName || "";
  else if (authUser.role === "staff") userName = authUser.staffName || "";
  else if (authUser.role === "hospital") userName = authUser.hospitalName || "";
  else if (authUser.role === "superadmin") userName = "Super Admin";

  const tokenPayload = {
    id: authUser.id,
    name: userName,
    role: authUser.role,
    roleId: authUser.roleId,
    hospitalId: authUser.hospitalId,
    staffId: authUser.staffId,
    doctorId: authUser.doctorId,
    superadminId: authUser.superadminId,
  };

  const token = jwt.sign({ ...tokenPayload, isRefresh: false }, jwtKey, { expiresIn: "1d" });

  const refreshToken = jwt.sign({ ...tokenPayload, isRefresh: true }, jwtKey, { expiresIn: "2w" });

  setRefreshTokenCookie(res, refreshToken);

  // 9. Sanitize user
  const safeUser = authUser.toJSON();
  delete safeUser.password;
  delete safeUser.otp;
  delete safeUser.otpExpiry;

  // 10. Fetch profile & permissions with error handling & timeouts
  let profileData = null;
  try {
    profileData = await fetchRelatedProfile(authUser);
  } catch (err: any) {
    console.error("Failed to fetch profile:", err.message);
  }

  let authPermission = null;
  if (profileData?.roleId) {
    try {
      authPermission = await fetchRolePermissions(
        profileData.roleId,
        profileData.hospitalId,
        profileData.role
      );
    } catch (err: any) {
      console.error("Failed to fetch permissions:", err.message);
    }
  }

  // 11. Return response
  let auditDepartment = undefined;
  let auditLocation = undefined;
  
  if (user.role?.toLowerCase() === 'doctor') {
    auditDepartment = profileData?.department;
  } else if (user.role?.toLowerCase() === 'staff') {
    auditDepartment = profileData?.designation;
  } else if (['hospital', 'admin', 'hospital_admin'].includes(user.role?.toLowerCase())) {
    auditDepartment = profileData?.type || profileData?.hospitalType;
  }
  
  if (profileData?.address) {
    const { district, state, place } = profileData.address;
    if (district && state) auditLocation = `${district}, ${state}`;
    else if (place && state) auditLocation = `${place}, ${state}`;
    else if (district) auditLocation = district;
    else if (state) auditLocation = state;
  }

  await createAuditLog({ 
    req, 
    authId: user.id, 
    name: userName, 
    role: user.role, 
    department: auditDepartment, 
    hospitalId: user.hospitalId || (['hospital', 'admin', 'hospital_admin'].includes(user.role?.toLowerCase()) ? user.id : undefined), 
    status: 'Active',
    registeredAddress: auditLocation
  });
  res.status(200).json({
    success: true,
    message: "Logged in successfully",
    status: 200,
    token,
    data: safeUser,
    profile: profileData,
    error: null,
    authDefaultPermission: 1,
    authPermission,
  });
});

// ===================== LOGIN WITH PHONE (OTP) =====================
export const loginWithPhone: any = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body;

  if (!phone) {
    res.status(400).json({ success: false, message: "Phone number is required" });
    return;
  }

  let numericPhone = phone.replace(/\D/g, "").slice(-10);

  const user = await Auth.findOne({
    where: {
      phone: numericPhone,
      isDelete: false,
    },
  });

  if (!user) {
    res.status(404).json({
      success: false,
      message: "User not found with this phone number",
    });
    return;
  }

  const jwtKey = process.env.JWT_SECRET || "supersecretjwtkey";
  const token = jwt.sign({ id: user.id, role: user.role, isRefresh: false }, jwtKey, {
    expiresIn: "1d",
  });

  const refreshToken = jwt.sign(
    { id: user.id, role: user.role, isRefresh: true },
    jwtKey,
    { expiresIn: "2w" }
  );

  const otp =
    numericPhone === APPLE_TEST_NUMBER
      ? APPLE_TEST_OTP
      : Math.floor(100000 + Math.random() * 900000).toString();

  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  await user.update({ otp, otpExpiry });

  if (numericPhone !== APPLE_TEST_NUMBER) {
    const client = getTwilioClient();
    const twilioNumber = process.env.TWILIO_NUMBER;

    if (client && twilioNumber) {
      try {
        const targetNumber = phone.startsWith("+") ? phone : `+91${numericPhone}`;
        await client.messages.create({
          body: `Your verification code is: ${otp}. Valid for 10 minutes.`,
          from: twilioNumber,
          to: targetNumber,
        });
      } catch (err: any) {
        console.error("Twilio Error:", err.message);
      }
    }

    if (user.email) {
      try {
        await sendOtpEmail(user.email, otp, "User");
      } catch (err: any) {
        console.error("Email OTP Error:", err.message);
      }
    }
  }

  setRefreshTokenCookie(res, refreshToken);

  res.status(200).json({
    success: true,
    status: 200,
    token,
    otp,
    error: null,
    message:
      numericPhone === APPLE_TEST_NUMBER
        ? "OTP sent (TEST ACCOUNT)"
        : "OTP sent to your registered phone and email",
    data: numericPhone === APPLE_TEST_NUMBER ? { otp: APPLE_TEST_OTP } : null,
  });
});

// ===================== SEND OTP (EMAIL) =====================
export const sendOtp: any = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ success: false, message: "Email is required" });
    return;
  }

  const user = await Auth.findOne({ where: { email } });
  if (!user) {
    res.status(404).json({ success: false, message: "User not found with this email" });
    return;
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  await user.update({ otp, otpExpiry });

  try {
    await sendOtpEmail(email, otp, "User");
    res.json({ success: true, message: "OTP sent to email" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

// ===================== VERIFY OTP =====================
export const verifyOtp: any = asyncHandler(async (req: Request, res: Response) => {
  const { phone, email, otp, fcmToken } = req.body;

  if ((!phone && !email) || !otp) {
    res.status(400).json({
      success: false,
      message: "Identifier (phone/email) and OTP are required",
    });
    return;
  }

  let user;
  if (phone) {
    let numericPhone = phone.replace(/\D/g, "").slice(-10);
    user = await Auth.scope("withPassword").findOne({ where: { phone: numericPhone } });
  } else if (email) {
    user = await Auth.scope("withPassword").findOne({ where: { email } });
  }

  if (!user || user.otp !== otp.toString()) {
    if (user) {
      await createAuditLog({ req, authId: user.id, name: user.doctorName || user.staffName || user.hospitalName || 'Unknown', role: user.role, status: 'Failed', riskLevel: 'High', loginMethod: 'OTP' });
    }
    res.status(400).json({ success: false, message: "Invalid OTP" });
    return;
  }

  if (user.otpExpiry && new Date() > user.otpExpiry) {
    await createAuditLog({ req, authId: user.id, name: user.doctorName || user.staffName || user.hospitalName || 'Unknown', role: user.role, status: 'Failed', riskLevel: 'High', loginMethod: 'OTP' });
    res.status(400).json({ success: false, message: "OTP has expired" });
    return;
  }

  // Update FCM token
  if (fcmToken) {
    const fieldName = `${user.role}_fcmtoken` as keyof typeof user;

    const parseToken = (token: any): any => {
      if (typeof token === "string") {
        try {
          return JSON.parse(token);
        } catch {
          return token;
        }
      }
      return token;
    };

    const existingRaw = user[fieldName] || [];
    const existingTokens = Array.isArray(existingRaw) ? existingRaw.map(parseToken) : [];

    const newRaw = Array.isArray(fcmToken) ? fcmToken : [fcmToken];
    const newTokens = newRaw.map(parseToken);

    const updatedTokens = [
      ...existingTokens.filter(
        (oldToken) => !newTokens.some((newToken) => newToken.deviceId === oldToken.deviceId)
      ),
      ...newTokens,
    ];

    await user.update({
      [fieldName]: updatedTokens,
    });
  }

  await user.update({ otp: null as any, otpExpiry: null as any });

  const jwtKey = process.env.JWT_SECRET || "supersecretjwtkey";
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      isRefresh: false,
      roleId: user.roleId,
      hospitalId: user.hospitalId,
      staffId: user.staffId,
      doctorId: user.doctorId,
      superadminId: user.superadminId,
    },
    jwtKey,
    { expiresIn: "1d" }
  );

  const safeUser = user.toJSON();
  delete safeUser.password;
  delete safeUser.otp;
  delete safeUser.otpExpiry;

  const refreshToken = jwt.sign(
    {
      id: user.id,
      role: user.role,
      isRefresh: true,
      roleId: user.roleId,
      hospitalId: user.hospitalId,
      staffId: user.staffId,
      doctorId: user.doctorId,
      superadminId: user.superadminId,
    },
    jwtKey,
    { expiresIn: "2w" }
  );

  setRefreshTokenCookie(res, refreshToken);

  // Fetch related profile from other microservices
  let profileData = null;
  try {
    profileData = await fetchRelatedProfile(user);
  } catch (err: any) {
    console.error("Failed to fetch profile:", err.message);
  }

  console.log("PROFILE DATA");
  console.log(profileData);
  console.log("roleId:", profileData?.roleId);
  console.log("hospitalId:", profileData?.hospitalId);
  console.log("role:", profileData?.role);

  let authPermission = null;
  if (profileData?.roleId) {
    try {
      authPermission = await fetchRolePermissions(
        profileData.roleId,
        profileData.hospitalId,
        profileData.role
      );
    } catch (err: any) {
      console.error("Failed to fetch permissions:", err.message);
    }
  }

  let auditDepartment = undefined;
  let auditLocation = undefined;
  
  if (user.role?.toLowerCase() === 'doctor') {
    auditDepartment = profileData?.department;
  } else if (user.role?.toLowerCase() === 'staff') {
    auditDepartment = profileData?.designation;
  } else if (['hospital', 'admin', 'hospital_admin'].includes(user.role?.toLowerCase())) {
    auditDepartment = profileData?.type || profileData?.hospitalType;
  }
  
  if (profileData?.address) {
    const { district, state, place } = profileData.address;
    if (district && state) auditLocation = `${district}, ${state}`;
    else if (place && state) auditLocation = `${place}, ${state}`;
    else if (district) auditLocation = district;
    else if (state) auditLocation = state;
  }

  await createAuditLog({ 
    req, 
    authId: user.id, 
    name: user.doctorName || user.staffName || user.hospitalName || 'Unknown', 
    role: user.role, 
    department: auditDepartment, 
    hospitalId: user.hospitalId || (['hospital', 'admin', 'hospital_admin'].includes(user.role?.toLowerCase()) ? user.id : undefined), 
    status: 'Active', 
    loginMethod: 'OTP',
    registeredAddress: auditLocation
  });

  res.status(200).json({
    success: true,
    message: "OTP verified",
    token,
    data: safeUser,
    profile: profileData,
    authDefaultPermission: 1,
    authPermission,
  });
});

export const verifyLoginOtp = verifyOtp;

// ===================== RESET PASSWORD =====================
export const resetPassword: any = asyncHandler(async (req: Request, res: Response) => {
  const { email, newPassword } = req.body;

  const user = await Auth.scope("withPassword").findOne({ where: { email } });

  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  user.password = newPassword;
  user.otp = null as any;
  user.otpExpiry = null as any;

  await user.save();

  // Sync password to the role-specific service with timeout
  try {
    if (user.role == "hospital") {
      await axios.put(
        `${process.env.HOSPITAL_SERVICE_URL}/internal/hospital/${user.hospitalId}/password`,
        { password: newPassword },
        {
          headers: { "x-service-secret": process.env.INTERNAL_SERVICE_SECRET },
          timeout: 3000,
        }
      );
    } else if (user.role == "staff") {
      await axios.put(
        `${process.env.STAFF_SERVICE_URL}/staff/internal/${user.staffId}/password`,
        { newPassword: newPassword, confirmPassword: newPassword },
        {
          headers: { "x-service-secret": process.env.INTERNAL_SERVICE_SECRET },
          timeout: 3000,
        }
      );
    } else if (user.role == "doctor") {
      await axios.put(
        `${process.env.DOCTOR_SERVICE_URL}/doctor/internal/${user.doctorId}/password`,
        { newPassword: newPassword, confirmPassword: newPassword },
        {
          headers: { "x-service-secret": process.env.INTERNAL_SERVICE_SECRET },
          timeout: 3000,
        }
      );
    }
  } catch (syncError: any) {
    console.error(
      "⚠️ Failed to sync password to role service:",
      syncError.response?.data || syncError.message
    );
    // Auth DB is already updated, so we continue
  }

  res.json({ success: true, message: "Password reset successful" });
});

export const internalUpdateStaffPassword = async (req: Request, res: Response) => {
  try {
    console.log("========== INTERNAL UPDATE ==========");
    console.log("Params:", req.params);
    console.log("Body:", req.body);

    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password is required",
      });
    }

    const auth = await Auth.scope("withPassword").findOne({
      where: {
        role: "staff",
        staffId: Number(id),
      },
    });

    console.log("Auth result:", auth);

    if (!auth) {
      console.log("❌ No auth found for staffId:", id);
      return res.status(404).json({
        success: false,
        message: "Staff authentication record not found",
      });
    }

    console.log("✅ Found auth:", auth.id);

    // Update the password - let Sequelize beforeUpdate hook hash it!
    auth.password = newPassword;
    await auth.save();

    console.log("✅ Staff password updated in auth service");

    return res.status(200).json({
      success: true,
      message: "Staff password updated successfully in auth service",
    });
  } catch (err: any) {
    console.error("Internal staff password update failed:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update staff password",
      error: err.message,
    });
  }
};

export const internalUpdateDoctorPassword = async (req: Request, res: Response) => {
  try {
    console.log("========== INTERNAL UPDATE ==========");
    console.log("Params:", req.params);
    console.log("Body:", req.body);

    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password is required",
      });
    }

    const auth = await Auth.scope("withPassword").findOne({
      where: {
        role: "doctor",
        doctorId: Number(id),
      },
    });

    console.log("Auth result:", auth);

    if (!auth) {
      console.log("❌ No auth found for doctorId:", id);
      return res.status(404).json({
        success: false,
        message: "doctor authentication record not found",
      });
    }

    console.log("✅ Found auth:", auth.id);

    // Update the password - let Sequelize beforeUpdate hook hash it!
    auth.password = newPassword;
    await auth.save();

    console.log("✅ doctor password updated in auth service");

    return res.status(200).json({
      success: true,
      message: "doctor password updated successfully in auth service",
    });
  } catch (err: any) {
    console.error("Internal doctor password update failed:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update doctor password",
      error: err.message,
    });
  }
};

// ===================== CHANGE PASSWORD =====================
export const changePassword: any = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  const user = await Auth.scope("withPassword").findByPk(req.user.id);
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password || "");
  if (!isMatch) {
    res.status(401).json({ success: false, message: "Incorrect current password" });
    return;
  }

  user.password = newPassword;
  await user.save();

  try {
    if (user.role == "hospital") {
      await axios.put(
        `${process.env.HOSPITAL_SERVICE_URL}/internal/hospital/${user.hospitalId}/password`,
        { password: newPassword },
        {
          headers: { "x-service-secret": process.env.INTERNAL_SERVICE_SECRET },
          timeout: 3000,
        }
      );
    } else if (user.role == "staff") {
      await axios.put(
        `${process.env.STAFF_SERVICE_URL}/staff/internal/${user.staffId}/password`,
        { password: newPassword },
        {
          headers: { "x-service-secret": process.env.INTERNAL_SERVICE_SECRET },
          timeout: 3000,
        }
      );
    } else if (user.role == "doctor") {
      await axios.put(
        `${process.env.DOCTOR_SERVICE_URL}/internal/doctor/${user.doctorId}/password`,
        { password: newPassword },
        {
          headers: { "x-service-secret": process.env.INTERNAL_SERVICE_SECRET },
          timeout: 3000,
        }
      );
    }
  } catch (syncError: any) {
    console.error(
      "⚠️ Failed to sync password to role service during changePassword:",
      syncError.response?.data || syncError.message
    );
    // Auth DB is already updated, so we continue
  }

  res.json({ success: true, message: "Password changed successfully" });
});

// ===================== REFRESH TOKEN =====================
export const refreshHospitalToken: any = asyncHandler(async (req: Request, res: Response) => {
  try {
    const rfToken = req.cookies.refreshToken;
    if (!rfToken) {
      res.status(401).json({ message: "No refresh token provided" });
      return;
    }

    jwt.verify(
      rfToken,
      process.env.JWT_SECRET || "supersecretjwtkey",
      async (err: any, decoded: any) => {
        if (err) {
          res.status(403).json({ message: "Invalid refresh token" });
          return;
        }

        const user = await Auth.findByPk(decoded.id);
        if (!user) {
          res.status(404).json({ message: "User not found" });
          return;
        }

        const accessToken = jwt.sign(
          {
            id: user.id,
            role: user.role,
            isRefresh: false,
            roleId: user.roleId,
            hospitalId: user.hospitalId,
            staffId: user.staffId,
            doctorId: user.doctorId,
            superadminId: user.superadminId,
          },
          process.env.JWT_SECRET || "supersecretjwtkey",
          { expiresIn: "1d" }
        );
        res.status(200).json({ accessToken });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// ===================== LOGOUT =====================
export const logout: any = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id, deviceId, role } = req.body;

  if (!id || !deviceId || !role) {
    res.status(400).json({
      success: false,
      message: "id, role and deviceId are required",
    });
    return;
  }

  const auth = await Auth.findByPk(id);

  if (!auth) {
    res.status(404).json({
      success: false,
      message: "User not found",
    });
    return;
  }

  const roleFieldMap: Record<string, string> = {
    doctor: "doctor_fcmtoken",
    staff: "staff_fcmtoken",
    hospital: "hospital_fcmtoken",
    superadmin: "superadmin_fcmtoken",
  };

  const tokenField = roleFieldMap[role];

  if (!tokenField) {
    res.status(400).json({
      success: false,
      message: "Invalid role",
    });
    return;
  }

  const tokens = (auth.get(tokenField) || []) as any[];

  const updatedTokens = tokens.filter((token) => token.deviceId !== deviceId);

  await auth.update({
    [tokenField]: updatedTokens,
  });

  await updateAuditLogOnLogout(auth.id);

  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    email,
    phone,
    password,
    role,
    roleId,
    superadminId,
    doctorId,
    staffId,
    hospitalId,
    hospitalName,
    doctorName,
    staffName,
  } = req.body;
  console.log("hos,na", hospitalName);

  // Validation
  if (!password || (!email && !phone)) {
    res.status(400).json({
      success: false,
      message: "Email or phone and password are required.",
    });
    return;
  }

  // Create user
  const auth = await Auth.create({
    email,
    phone,
    password,
    role,
    roleId,
    superadminId,
    doctorId,
    staffId,
    hospitalId,
    hospitalName,
    doctorName,
    staffName,
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully.",
    data: auth,
  });
  return;
});

export const update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  console.log("===== UPDATE CONTROLLER CALLED =====");

  const { id, roles }: any = req.params;
  const { updatePayload }: any = req.body;

  console.log("up", updatePayload, id, roles);

  let where: any = {};

  switch (roles) {
    case "doctor":
      where.doctorId = id;
      break;

    case "staff":
      where.staffId = id;
      break;

    case "hospital":
      where.hospitalId = id;
      break;

    case "superadmin":
      where.superadminId = id;
      break;

    default:
      res.status(400).json({
        success: false,
        message: "Invalid role",
      });
      return;
  }

  // Add role filter to avoid matching wrong records (e.g. doctor/staff with same hospitalId)
  where.role = roles;

  // Use withPassword scope when password is being updated so beforeUpdate hook works correctly
  const auth: any = updatePayload?.password
    ? await Auth.scope("withPassword").findOne({ where })
    : await Auth.findOne({ where });

  if (!auth) {
    res.status(404).json({
      success: false,
      message: "User not found.",
    });
    return;
  }

  if (updatePayload.displayName) {
    updatePayload.doctorName = updatePayload.displayName;
    delete updatePayload.displayName;
  }

  try {
    await auth.update(updatePayload);
  } catch (err: any) {
    console.error("Sequelize Validation Error Details:", err.errors || err.message);
    throw err;
  }

  console.log("roles:", roles);
  console.log("id:", id);
  console.log("updatePayload:", updatePayload);
  console.log("hospital name:", updatePayload.hospitalName);

  if (roles == "hospital" && updatePayload.hospitalName) {
    console.log("hospital name:", updatePayload.hospitalName);
    await Auth.update(
      {
        hospitalName: updatePayload.hospitalName,
      },
      {
        where: {
          hospitalId: id,
        },
      }
    );
    console.log("hospital name:", updatePayload.hospitalName);
  }

  // Update FCM token array based on role
  if (updatePayload.deviceId && updatePayload.fcmToken && updatePayload.platform) {
    const fieldMap: any = {
      doctor: "doctor_fcmtoken",
      staff: "staff_fcmtoken",
      hospital: "hospital_fcmtoken",
      superadmin: "superadmin_fcmtoken",
    };

    const field = fieldMap[auth.role];

    if (field) {
      const tokens = auth[field] || [];

      const index = tokens.findIndex((item: any) => item.deviceId === updatePayload.deviceId);

      const tokenData = {
        deviceId: updatePayload.deviceId,
        fcmToken: updatePayload.fcmToken,
        platform: updatePayload.platform,
      };

      if (index !== -1) {
        tokens[index] = tokenData;
      } else {
        tokens.push(tokenData);
      }

      await auth.update({
        [field]: tokens,
      });
    }
  }

  res.status(200).json({
    success: true,
    message: "User updated successfully.",
    data: auth,
  });
});

export const deleteAuth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id, roles }: any = req.params;

  let where: any = {};

  switch (roles) {
    case "doctor":
      where.doctorId = id;
      break;

    case "staff":
      where.staffId = id;
      break;

    case "hospital":
      where.hospitalId = id;
      break;

    case "superadmin":
      where.superadminId = id;
      break;

    default:
      res.status(400).json({
        success: false,
        message: "Invalid role",
      });
      return;
  }

  // Add role filter to avoid matching wrong records
  where.role = roles;

  const auth: any = await Auth.findOne({ where });

  if (!auth) {
    res.status(404).json({
      success: false,
      message: "User not found.",
    });
    return;
  }

  await auth.destroy();

  res.status(200).json({
    success: true,
    message: "User deleted successfully.",
  });
});

export const getAuthByid = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id, roles }: any = req.params;

  let where: any = {};

  where.role = roles;

  switch (roles) {
    case "doctor":
      where.doctorId = id;
      break;

    case "staff":
      where.staffId = id;
      break;

    case "hospital":
      where.hospitalId = id;
      break;

    case "superadmin":
      where.superadminId = id;
      break;

    default:
      res.status(400).json({
        success: false,
        message: "Invalid role",
      });
      return;
  }

  const auth: any = await Auth.findOne({ where });

  if (!auth) {
    res.status(404).json({
      success: false,
      message: "User not found.",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "User fetched successfully.",
    data: auth,
  });
});
