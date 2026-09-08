import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("3004"),
  DATABASE_URL: z.string().url(),
  RABBITMQ_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(10),
  HOSPITAL_SERVICE_URL: z.string().url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables in Blood Bank Service:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
