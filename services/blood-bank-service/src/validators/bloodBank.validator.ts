import { z } from "zod";

export const bloodBankSchema = z.object({
  hospitalId: z.number().int().positive("Hospital ID is required"),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]),
  count: z.number().int().nonnegative().default(0),
});

export const updateBloodBankSchema = z.object({
  count: z.number().int().nonnegative().optional(),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]).optional(),
});

// ID parameter validation
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "Invalid ID format"),
});

export type BloodBankInput = z.infer<typeof bloodBankSchema>;
export type UpdateBloodBankInput = z.infer<typeof updateBloodBankSchema>;
