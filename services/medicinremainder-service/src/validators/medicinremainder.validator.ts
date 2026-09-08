import { z } from "zod";

export const medicineScheduleSchema = z.object({
  medicineName: z.string().min(1, "Medicine name is required"),
  dosage: z.string().optional(),
  days: z.array(z.string()).min(1, "At least one day is required"),
  timeSlots: z.array(z.string()).min(1, "At least one time slot is required"),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()).optional(),
});

export const updateMedicineScheduleSchema = medicineScheduleSchema.partial();

// ID parameter validation
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "Invalid ID format"),
});

export type MedicineScheduleInput = z.infer<typeof medicineScheduleSchema>;
export type UpdateMedicineScheduleInput = z.infer<typeof updateMedicineScheduleSchema>;
