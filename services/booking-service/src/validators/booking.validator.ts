import { z } from "zod";

export const createBookingSchema = z.object({
  patient_name: z.string().min(1, "Patient name is required"),
  patient_phone: z.string().regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),
  patient_place: z.string().optional(),
  patient_dob: z.string().optional(),
  userId: z.number().int().positive(),
  doctorId: z.number().int().positive(),
  hospitalId: z.number().int().positive(),
  booking_date: z.string().or(z.date()),
  booking_time: z.string().min(1, "Booking time is required"),
});



export const updateBookingStatusSchema = z.object({
  status: z.enum(["pending", "accepted", "declined", "cancel"]),
});

export const updateBookingSchema = createBookingSchema.partial();

// ID parameter validation
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "Invalid ID format"),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
