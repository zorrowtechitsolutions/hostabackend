import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import type { Server as HttpServer } from "http";
import { env } from "../config/env.js";

export let io: Server;

const createRedisClient = () => {
  const client = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    username: env.REDIS_USERNAME || undefined,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
    connectTimeout: 5000,
  });

  client.on("error", (err: Error) => {
    console.error("Redis Pub/Sub error:", err.message);
  });

  return client;
};

export const initSocket = async (server: HttpServer) => {
  // Support comma-separated origins in CLIENT_URL, e.g.:
  // CLIENT_URL=https://test.hostahospital.com,http://localhost:5173
  const allowedOrigins = (env.CLIENT_URL || "*")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: allowedOrigins.length === 1 && allowedOrigins[0] === "*"
        ? "*"
        : (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
              callback(null, true);
            } else {
              callback(new Error(`CORS: origin '${origin}' not allowed`));
            }
          },
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
  });

  const pubClient = createRedisClient();
  const subClient = pubClient.duplicate();

  try {
    await pubClient.connect();
    await subClient.connect();
    io.adapter(createAdapter(pubClient, subClient));
    console.log("Redis adapter initialized");
  } catch (error) {
    console.warn("Redis adapter unavailable, continuing without it:", error);
  }

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId) => {
      if (roomId === undefined || roomId === null || roomId === "") {
        console.warn("No roomId provided");
        return;
      }

      const roomName = String(roomId);

      if (socket.rooms.has(roomName)) {
        console.log(`User ${socket.id} already in room: ${roomName}`);
        return;
      }

      socket.join(roomName);
      console.log(`User ${socket.id} joined room: ${roomName}`);

      socket.emit("room-joined", {
        roomId: roomName,
        message: "Successfully joined room",
      });
    });

    socket.on("leave-room", (roomId) => {
      if (roomId === undefined || roomId === null || roomId === "") return;
      const roomName = String(roomId);
      socket.leave(roomName);
      console.log(`User ${socket.id} left room: ${roomName}`);
    });

    socket.on("leave-all-rooms", () => {
      for (const room of Array.from(socket.rooms)) {
        if (room !== socket.id) {
          socket.leave(room);
        }
      }
      console.log(`User ${socket.id} left all rooms`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`User disconnected: ${socket.id} (${reason})`);
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });

  console.log("Socket.io initialized successfully");
  return io;
};