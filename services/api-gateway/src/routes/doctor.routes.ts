import express from "express";
import { proxyRequest } from "../services/doctor.service";

const router = express.Router();

router.use("/doctor", proxyRequest);

export default router;
