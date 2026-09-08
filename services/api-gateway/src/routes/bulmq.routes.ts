// import express from "express";
// import { proxyRequest } from "../services/bulmq.service";

// const router = express.Router();

// // Proxy all /bulmq/* requests to the bulmq-service
// // Exposes: POST /api/bulmq/booking-task
// //          POST /api/bulmq/medicin-task
// router.use("/bulmq", proxyRequest);

// export default router;




import express from "express";
import { proxyRequest } from "../services/bulmq.service";

const router = express.Router();

// Proxy all requests starting with /users, /patients, or /vitals to the user-service
router.use("/booking-task/hospital", proxyRequest);
router.use("/booking-task/users", proxyRequest);
router.use("/booking-task/auto-decline", proxyRequest);
router.use("/medicin-task", proxyRequest);







export default router;