import { z } from "zod";

export const loginHospitalSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  phone: z.string().regex(/^[0-9]{10}$/, "Invalid phone format").optional(),
  password: z.string().min(1, "Password is required"),
  fcmToken: z.object({
    deviceId: z.string(),
    fcmToken: z.string(),
    platform: z.enum(["android", "ios", "web"]),
  }).optional().nullable(),
}).refine(data => data.email || data.phone, {
  message: "Either email or phone is required",
  path: ["email"],
});

export const loginWithPhoneSchema = z.object({
  phone: z.string().regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),
});

export const loginWithEmailSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(/^[0-9]{10}$/, "Phone number must be 10 digits").optional(),
  email: z.string().email("Invalid email format").optional(),
  otp: z.string().length(6, "OTP must be 6 digits"),
  fcmToken: z.object({
    deviceId: z.string(),
    fcmToken: z.string(),
    platform: z.enum(["android", "ios", "web"]),
  }).optional().nullable(),
}).refine(data => data.email || data.phone, {
  message: "Either email or phone is required",
  path: ["phone"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters").optional(),
}).refine((data) => {
  if (data.confirmPassword !== undefined) {
    return data.newPassword === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters").optional(),
}).refine((data) => {
  if (data.confirmPassword !== undefined) {
    return data.newPassword === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});


export const registerSchema  =  z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string(),
  phone:  z.string().regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),
  superadminId: z.number().optional(),
  doctorId: z.number().optional(),
  staffId: z.number().optional(),
  hospitalId: z.number().optional(),
});

export const updateSchema  =  z.object({
  email: z.string().email("Invalid email format").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.string(),
  phone:  z.string().regex(/^[0-9]{10}$/, "Phone number must be 10 digits").optional(),
  superadminId: z.number().optional(),
  doctorId: z.number().optional(),
  staffId: z.number().optional(),
  hospitalId: z.number().optional(),
});

