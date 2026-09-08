import express from "express";
import { proxyRequest } from "../services/s3.service";

const router = express.Router();

// Forward all traffic to the s3 microservice
router.use("/presignurl", proxyRequest);

export default router;  