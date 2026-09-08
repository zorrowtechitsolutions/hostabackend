import express from "express";
import { proxyRequest } from "../services/review.service";

const router = express.Router();

// Forward all traffic to the review microservice
router.use("/review", proxyRequest);
router.use("/rating", proxyRequest);

export default router;  