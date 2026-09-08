import express from "express";
import { proxyRequest } from "../services/booking.service";

const router = express.Router();

router.use("/booking", proxyRequest);

export default router;
