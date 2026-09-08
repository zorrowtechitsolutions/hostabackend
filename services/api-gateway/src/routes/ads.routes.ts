import express from "express";
import { proxyRequest } from "../services/ads.service";

const router = express.Router();

router.use("/ads", proxyRequest);

export default router;
