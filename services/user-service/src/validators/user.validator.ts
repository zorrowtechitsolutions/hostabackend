import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().regex(/^[0-9]{10}$/, "Phone must be a 10-digit number"),
  fcmToken: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
    fcmToken: z
  .object({
    deviceId: z.string(),
    fcmToken: z.string(),
    platform: z.enum(["android", "ios", "web"]),
  })
  .optional()
  .nullable(),
});

export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/),
});

export const loginWithPhoneSchema = z.object({
    phone: z.string().regex(/^[0-9]{10}$/, "Phone must be a 10-digit number"),
});

export const verifyOtpSchema = z.object({
    phone: z.string().regex(/^[0-9]{10}$/, "Phone must be a 10-digit number"),
    otp: z.string().length(6, "OTP must be exactly 6 digits"),
    // fcmToken: z.string().nullable().optional().nullable(),
    fcmToken: z
  .object({
    deviceId: z.string(),
    fcmToken: z.string(),
    platform: z.enum(["android", "ios", "web"]),
  })
  .optional()
  .nullable(),
});



export const updateUserSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().regex(/^[0-9]{10}$/, "Phone must be a 10-digit number").optional(),
    relationType: z.enum(["mother", "father", "guardian"]).optional(),
    joinAccountId: z.number().optional(),
});

export const sendOtpEmailSchema = z.object({
    email: z.string().email(),
});

export const verifyOtpEmailSchema = z.object({
    email: z.string().email(),
    otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

export const resetPasswordEmailSchema = z.object({
    email: z.string().email(),
    newPassword: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters long").optional(),
}).refine((data) => {
    if (data.confirmPassword !== undefined) {
        return data.newPassword === data.confirmPassword;
    }
    return true;
}, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters long"),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters long").optional(),
}).refine((data) => {
    if (data.confirmPassword !== undefined) {
        return data.newPassword === data.confirmPassword;
    }
    return true;
}, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

