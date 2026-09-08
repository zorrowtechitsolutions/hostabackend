import express from "express";
import { proxyRequest } from "../services/blood.service";

const router = express.Router();

router.use("/donors", proxyRequest);

export default router;
