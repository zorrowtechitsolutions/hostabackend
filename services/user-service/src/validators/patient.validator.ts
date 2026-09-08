import { z } from "zod";

const locationSchema = z.object({
  country: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  place: z.string().min(1, "Place is required"),
  pincode: z.number().int().positive("Pincode must be a positive number"),
});

export const createPatientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]).optional(),
  gender: z.enum(["Male", "Female", "Other"]),
  maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"]).optional(),
  patientType: z.enum(["Inpatient", "Outpatient"]).optional(),
  age: z.number().int().min(0, "Age must be a positive number"),
  dob: z.string().or(z.date()).refine((val) => !isNaN(new Date(val).getTime()), {
    message: "Invalid date format for DOB",
  }),
  mobileNumber: z.string().regex(/^[0-9]{10}$/, "Mobile number must be a 10-digit number"),
  emergencyNumber: z.string().regex(/^[0-9]{10}$/, "Emergency number must be a 10-digit number").optional().or(z.literal('')),
  guardianName: z.string().optional(),
  addressLine: z.string().min(1, "Address line is required"),
  location: locationSchema,
  email: z.string().email("Invalid email format").optional().or(z.literal('')),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  userId: z.number().int().positive().optional(),
  hospitalId: z.number().int().positive("Hospital ID is required"),
  roleId: z.number().int().positive().optional(),
});

export const updatePatientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]).optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"]).optional(),
  patientType: z.enum(["Inpatient", "Outpatient"]).optional(),
  age: z.number().int().min(0, "Age must be a positive number").optional(),
  dob: z.string().or(z.date()).refine((val) => !isNaN(new Date(val).getTime()), {
    message: "Invalid date format for DOB",
  }).optional(),
  mobileNumber: z.string().regex(/^[0-9]{10}$/, "Mobile number must be a 10-digit number").optional(),
  emergencyNumber: z.string().regex(/^[0-9]{10}$/, "Emergency number must be a 10-digit number").optional().or(z.literal('')),
  guardianName: z.string().optional(),
  addressLine: z.string().min(1, "Address line is required").optional(),
  location: locationSchema.optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal('')),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  userId: z.number().int().positive().optional(),
  hospitalId: z.number().int().positive("Hospital ID is required").optional(),
  roleId: z.number().int().positive().optional(),
});
