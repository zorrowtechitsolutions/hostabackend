import { z } from "zod";

export const createTemplateSchema = z.object({
  templateName: z.string().min(1, "Template name is required"),
  category: z.string().min(1, "Category is required"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  status: z.enum(["Active", "Inactive"]).optional(),
});

export const updateTemplateSchema = z.object({
  templateName: z.string().min(1, "Template name is required").optional(),
  category: z.string().min(1, "Category is required").optional(),
  subject: z.string().min(1, "Subject is required").optional(),
  message: z.string().min(1, "Message is required").optional(),
  status: z.enum(["Active", "Inactive"]).optional(),
});
