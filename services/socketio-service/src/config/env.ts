import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: process.env.PORT || 3019,
  CLIENT_URL: process.env.CLIENT_URL || "*",

  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
  REDIS_USERNAME: process.env.REDIS_USERNAME || "default",
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || "",
};