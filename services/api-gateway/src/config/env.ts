import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.string().default("3000"),
  USER_SERVICE_URL: z.string().min(1),
  AMBULANCE_SERVICE_URL: z.string().min(1),
  BLOOD_SERVICE_URL: z.string().min(1),
  BLOOD_BANK_SERVICE_URL: z.string().min(1),
  // PHARMACY_SERVICE_URL: z.string().min(1),
  STAFF_SERVICE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(10),
  DOCTOR_SERVICE_URL: z.string().min(1),
  SPECIALITY_SERVICE_URL: z.string().min(1),
  HOSPITAL_SERVICE_URL: z.string().min(1),
  MEDICINREMINDER_SERVICE_URL: z.string().min(1),
  BOOKING_SERVICE_URL: z.string().min(1),
  NOTIFICATION_SERVICE_URL: z.string().min(1),
  REVIEW_SERVICE_URL: z.string().min(1),
  // LAB_SERVICE_URL: z.string().min(1),
  ADS_SERVICE_URL: z.string().min(1), 
  ROLE_SERVICE_URL: z.string().min(1), 
  S3_SERVICE_URL: z.string().min(1),
  BULMQ_SERVICE_URL: z.string().min(1),
  SOCKETIO_SERVICE_URL: z.string().min(1),
  AUTH_SERVICE_URL: z.string().min(1),
});


const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables in API Gateway:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
