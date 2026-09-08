import express from "express";
import { proxyRequest } from "../services/staff.service";

const router = express.Router();

// Forward all /pharmacy traffic to the pharmacy microservice
router.use("/staff", proxyRequest);

export default router;




