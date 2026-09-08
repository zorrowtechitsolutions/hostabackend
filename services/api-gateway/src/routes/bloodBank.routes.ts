import express from "express";
import { proxyRequest } from "../services/bloodBank.service";

const router = express.Router();

router.use("/blood-banks", proxyRequest);

export default router;
