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

// import dotenv from "dotenv";

// dotenv.config();

// const APP_ENV = process.env.APP_ENV?.trim();

// if (!APP_ENV) {
//   throw new Error(
//     "APP_ENV is required. Set it to demo or production."
//   );
// }

// export const env = {
//   PORT: Number(process.env.PORT) || 3019,

//   CLIENT_URL: process.env.CLIENT_URL || "*",

//   // Deployment environment
//   APP_ENV,

//   // Socket.IO Redis Pub/Sub channel
//   SOCKET_IO_REDIS_KEY:
//     process.env.SOCKET_IO_REDIS_KEY ||
//     `hosta:${APP_ENV}:socket.io`,

//   // Redis connection
//   REDIS_HOST: process.env.REDIS_HOST || "localhost",
//   REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
//   REDIS_USERNAME: process.env.REDIS_USERNAME || "default",
//   REDIS_PASSWORD: process.env.REDIS_PASSWORD || "",
// };