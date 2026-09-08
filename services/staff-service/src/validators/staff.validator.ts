import { z } from "zod";

const addressSchema = z.object({
  country: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  place: z.string().min(1, "Place is required"),
  pincode: z.number().min(100000, "Invalid pincode").max(999999, "Invalid pincode"),
});

export const registerStaffSchema = z.object({
  hospitalId: z.number().min(1, "Hospital ID is required"),
  name: z.string().min(1, "Name is required"),
  designation: z.string().optional(),
  joiningDate: z.string().optional(),
  staffType: z.string().optional(),
  jobType: z.string().optional(),
  phone: z.string().regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),
  email: z.string().email("Invalid email format").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  knowLanguages: z.array(z.string()).optional(),
  qualification: z.string().optional(),
  address: addressSchema,
    fcmToken: z
  .object({
    deviceId: z.string(),
    fcmToken: z.string(),
    platform: z.enum(["android", "ios", "web"]),
  })
  .optional()
  .nullable(),
});

export const updateStaffSchema = registerStaffSchema.partial();

export const loginStaffSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
    fcmToken: z
  .object({
    deviceId: z.string(),
    fcmToken: z.string(),
    platform: z.enum(["android", "ios", "web"]),
  })
  .optional()
  .nullable(),
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
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

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

// ID parameter validation
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "Invalid ID format"),
});

export type RegisterStaffInput = z.infer<typeof registerStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type LoginStaffInput = z.infer<typeof loginStaffSchema>;
