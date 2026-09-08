import express from "express";
import { proxyRequest } from "../services/user.service";

const router = express.Router();

// Proxy all requests starting with /users, /patients, or /vitals to the user-service
router.use("/users", proxyRequest);
router.use("/patients", proxyRequest);
router.use("/vitals", proxyRequest);
router.use("/prescription", proxyRequest);
router.use("/documents", proxyRequest);
router.use("/lab-results", proxyRequest);
router.use("/email-enquiry", proxyRequest);






export default router;

