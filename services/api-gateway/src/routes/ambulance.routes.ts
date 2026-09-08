import express from "express";
import { proxyRequest } from "../services/ambulance.service";

const router = express.Router();

router.use("/ambulance", proxyRequest);

export default router;
