import express from "express";
import { proxyRequest } from "../services/auth.service";

const router = express.Router();

router.use("/auth", proxyRequest);

export default router;
