import { z } from "zod";

const addressSchema = z.object({
  country: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  place: z.string().min(1, "Place is required"),
  pincode: z.number().min(100000, "Invalid pincode").max(999999, "Invalid pincode"),
});

const consultingSessionSchema = z.object({
  open: z.string().min(1, "Open time is required"),
  close: z.string().min(1, "Close time is required"),
});

const consultingSchema = z.object({
  morning_session: consultingSessionSchema.optional(),
  evening_session: consultingSessionSchema.optional(),
});

export const registerDoctorSchema = z.object({
  hospitalId: z.number().min(1, "Hospital ID is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  displayName: z.string().min(1, "Display name is required"),
  department: z.string().optional(),
  specialist: z.string().optional(),
  phone: z.string().regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),
  email: z.string().email("Invalid email format").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  fees: z.number().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  knowLanguages: z.array(z.string()).optional(),
  qualification: z.string().optional(),
  address: addressSchema,
  consulting: consultingSchema.optional(),
  bookingOpen: z.boolean().default(true),
    fcmToken: z
  .object({
    deviceId: z.string(),
    fcmToken: z.string(),
    platform: z.enum(["android", "ios", "web"]),
  })
  .optional()
  .nullable(),
});

export const updateDoctorSchema = registerDoctorSchema.partial();

export const loginDoctorSchema = z.object({
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
}).refine(data => data.phone || data.email, {
  message: "Either phone or email is required",
  path: ["phone"],
});

// export const resetPasswordSchema = z.object({
//   newPassword: z.string().min(6, "New password must be at least 6 characters"),
//   confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters").optional(),
// }).refine((data) => {
//   if (data.confirmPassword !== undefined) {
//     return data.newPassword === data.confirmPassword;
//   }
//   return true;
// }, {
//   message: "Passwords don't match",
//   path: ["confirmPassword"],
// });

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),   // add this
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


// export const changePasswordSchema = z.object({
//   currentPassword: z.string().min(1, "Current password is required"),
//   newPassword: z.string().min(6, "New password must be at least 6 characters"),
//   confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters").optional(),
// }).refine((data) => {
//   if (data.confirmPassword !== undefined) {
//     return data.newPassword === data.confirmPassword;
//   }
//   return true;
// }, {
//   message: "Passwords don't match",
//   path: ["confirmPassword"],
// });

export const changePasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});


// ID parameter validation
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "Invalid ID format"),
});

export type RegisterDoctorInput = z.infer<typeof registerDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type LoginDoctorInput = z.infer<typeof loginDoctorSchema>;
export type LoginWithPhoneInput = z.infer<typeof loginWithPhoneSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
