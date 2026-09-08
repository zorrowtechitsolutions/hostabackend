import express from "express";
import { proxyRequest } from "../services/notification.service";

const router = express.Router();

// Forward all /notification traffic to the notification microservice
router.use("/notification", proxyRequest);
router.use("/email", proxyRequest);

export default router;  