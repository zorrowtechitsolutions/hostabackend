import { Emitter } from "@socket.io/redis-emitter";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  username: process.env.REDIS_USERNAME || undefined,
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  connectTimeout: 5000,
});

redisClient.on("error", (err: Error) => {
  console.error("Redis emitter error:", err.message);
});

redisClient.on("connect", () => {
  console.log("Redis emitter connected");
});

void redisClient.connect().catch((err: Error) => {
  console.warn("Redis emitter unavailable, continuing without Redis pub/sub:", err.message);
});

export const socketEmitter = new Emitter(redisClient);

export const isRedisEmitterReady = (): boolean => redisClient.status === "ready";

export const safeSocketEmit = (room: string, event: string, payload: unknown): void => {
  if (!room || !event) return;

  try {
    if (!isRedisEmitterReady()) {
      console.warn(`Socket emit skipped for ${event} because Redis is not ready`);
      return;
    }

    socketEmitter.to(room).emit(event, payload);
  } catch (error: any) {
    console.error(`Failed to emit socket event ${event} to ${room}:`, error?.message || error);
  }
};

