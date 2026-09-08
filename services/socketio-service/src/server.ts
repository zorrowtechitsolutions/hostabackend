import http from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import { initSocket } from "./socket/socket.js";

const PORT = env.PORT;

const startServer = async () => {
  try {
    const server = http.createServer(app);

    await initSocket(server);

    server.listen(PORT, () => {
      console.log(`Socket service running on ${PORT}`);
    });

  } catch (error) {
    console.error("Socket Server Error:", error);
    process.exit(1);
  }
};

startServer();