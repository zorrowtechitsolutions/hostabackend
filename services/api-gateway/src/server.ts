// import app from "./app";
// import { env } from "./config/env";
// import { logger } from "./utils/logger";

// const PORT = env.PORT;

// app.listen(PORT, () => {
//   logger.info(`🚀 API Gateway (Production Ready) running on port ${PORT}`);
// });




import http from "http";
import app from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";

const PORT = env.PORT;

const server = http.createServer(app);

// In http-proxy-middleware v3, ws:true handles the upgrade automatically 
// IF the middleware is attached to the app. 
// However, since we are using http.createServer, we just need to ensure 
// the server handles the upgrade event correctly.

server.listen(PORT, () => {
  logger.info(`🚀 API Gateway (Production Ready) running on port ${PORT}`);
});
