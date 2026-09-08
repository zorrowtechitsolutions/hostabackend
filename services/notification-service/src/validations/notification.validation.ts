import { z } from "zod";

export const createNotificationSchema = z.object({
  userId: z.number().optional(),
  hospitalId: z.number().optional(),
  labId: z.number().optional(),
  staffId: z.number().optional(),
  pharmacyId: z.number().optional(),
  doctorId: z.number().optional(),
  message: z.string().min(1, "Message is required").max(1000, "Message too long"),
});

export const updateNotificationSchema = z.object({
  message: z.string().optional(),
  userIsRead: z.boolean().optional(),
  hospitalIsRead: z.boolean().optional(),
  labIsRead: z.boolean().optional(),
  staffIsRead: z.boolean().optional(),
  pharmacyIsRead: z.boolean().optional(),
  doctorIsRead: z.boolean().optional(),
});

export const getByRoleParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID must be a numeric string"),
  role: z.enum(["user", "doctor", "staff", "lab", "pharmacy", "hospital", "superadmin"]),
});



