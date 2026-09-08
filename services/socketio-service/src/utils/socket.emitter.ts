import { Emitter } from "@socket.io/redis-emitter";
import { Redis } from "ioredis";

/**
 * SocketEmitter Utility
 * Copy this file to any microservice that needs to send real-time events.
 * Make sure to install: npm install @socket.io/redis-emitter ioredis
 */

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || "",
  username: process.env.REDIS_USERNAME || "default",
});

export const socketEmitter = new Emitter(redisClient);

// Usage Example:
// socketEmitter.to("user-123").emit("new-notification", { message: "Hello!" });









