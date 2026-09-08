import { z } from "zod";

const addressSchema = z.object({
  country: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  place: z.string().min(1, "Place is required"),
  pincode: z.number().min(100000, "Invalid pincode").max(999999, "Invalid pincode"),
});

const workingHoursGeneralSchema = z.object({
  day: z.string().min(1, "Day is required"),
  opening_time: z.string().optional(),
  closing_time: z.string().optional(),
  is_holiday: z.boolean().optional(),
});

const consultingSessionSchema = z.object({
  open: z.string().min(1, "Open time is required"),
  close: z.string().min(1, "Close time is required"),
});

const workingHoursClinicSchema = z.object({
  day: z.string().min(1, "Day is required"),
  morning_session: consultingSessionSchema.optional(),
  evening_session: consultingSessionSchema.optional(),
  is_holiday: z.boolean().optional(),
  has_break: z.boolean().optional(),
});

export const registerHospitalSchema = z.object({
  name: z.string().min(1, "Hospital name is required"),
  type: z.string().min(1, "Hospital type is required"),
  address: addressSchema,
  phone: z.string().regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),
  emergencyContact: z.string().min(1, "Emergency contact is required"),
  email: z.string().email("Invalid email format").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  latitude: z.number(),
  longitude: z.number(),
  about: z.string().min(1, "About is required"),
  working_hours_general: z.array(workingHoursGeneralSchema).optional(),
  working_hours_clinic: z.array(workingHoursClinicSchema).optional(),
    fcmToken: z
  .object({
    deviceId: z.string(),
    fcmToken: z.string(),
    platform: z.enum(["android", "ios", "web"]),
  })
  .optional()
  .nullable(),
});

export const updateHospitalSchema = registerHospitalSchema.partial();

export const loginHospitalSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  phone: z.string().regex(/^[0-9]{10}$/, "Invalid phone format").optional(),
  password: z.string().min(1, "Password is required"),
    fcmToken: z
  .object({
    deviceId: z.string(),
    fcmToken: z.string(),
    platform: z.enum(["android", "ios", "web"]),
  })
  .optional()
  .nullable(),
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
    fcmToken: z
  .object({
    deviceId: z.string(),
    fcmToken: z.string(),
    platform: z.enum(["android", "ios", "web"]),
  })
  .optional()
  .nullable(),
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

export const sendCustomEmailSchema = z.object({
  to: z.string().email("Invalid recipient email").optional(),
  email: z.string().email("Invalid sender email").optional(),
  name: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

// ID parameter validation
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "Invalid ID format"),
});

export type RegisterHospitalInput = z.infer<typeof registerHospitalSchema>;
export type UpdateHospitalInput = z.infer<typeof updateHospitalSchema>;
export type LoginHospitalInput = z.infer<typeof loginHospitalSchema>;
export type LoginWithPhoneInput = z.infer<typeof loginWithPhoneSchema>;
export type LoginWithEmailInput = z.infer<typeof loginWithEmailSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type SendCustomEmailInput = z.infer<typeof sendCustomEmailSchema>;
