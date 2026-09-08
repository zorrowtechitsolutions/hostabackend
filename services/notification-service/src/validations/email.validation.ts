import { z } from "zod";

const recipientSchema = z.object({
  roleId: z.number(),
  all: z.boolean(),
  userIds: z.array(z.number()).optional(),
});

export const createEmailNotificationSchema = z.object({
  recipients: z.array(recipientSchema).optional(),
  subject: z.string().optional(),
  message: z.string().optional(),
  templateId: z.number().optional(),
}).refine(data => (data.subject && data.message) || data.templateId, {
  message: "Either (subject and message) or templateId must be provided",
});

export const updateEmailNotificationSchema = z.object({
  subject: z.string().optional(),
  message: z.string().optional(),
  recipients: z.array(recipientSchema).optional(),
  templateId: z.number().optional(),
});

export const saveDraftSchema = z.object({
  recipients: z.array(recipientSchema).optional(),
  subject: z.string().optional(),
  message: z.string().optional(),
  templateId: z.number().optional(),
});
