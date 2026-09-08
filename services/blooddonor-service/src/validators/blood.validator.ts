import { z } from "zod";

export const donorSchema = z.object({
  phone: z.string().regex(/^[0-9]{10}$/, "Phone must be a 10-digit number"),
  dateOfBirth: z.string().or(z.date()),
  bloodGroup: z.enum(["O+", "O-", "AB+", "AB-", "A+", "A-", "B+", "B-"]),
  address: z.object({
    place: z.string(),
    pincode: z.number().int(),
    country: z.string().optional(),
    state: z.string().optional(),
    district: z.string().optional(),
  }),
});

export const idParamSchema = z.object({
    id: z.string().regex(/^\d+$/),
});

export const phoneLoginSchema = z.object({
  phone: z.string().min(10, "Phone number is required"),
});

export const otpSchema = z.object({
  phone: z.string().min(10, "Phone number is required"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});
