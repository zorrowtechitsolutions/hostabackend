import { z } from "zod";

export const specialitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  picture: z.object({
    imageUrl: z.string().url().optional(),
    public_id: z.string().optional()
  }).optional(),
});

export const updateSpecialitySchema = specialitySchema.partial();

// ID parameter validation
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "Invalid ID format"),
});

export type SpecialityInput = z.infer<typeof specialitySchema>;
export type UpdateSpecialityInput = z.infer<typeof updateSpecialitySchema>;
