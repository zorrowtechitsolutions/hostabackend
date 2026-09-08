import express from "express";
import { proxyRequest } from "../services/speciality.service";

const router = express.Router();

router.use("/speciality", proxyRequest);
router.use("/category", proxyRequest);

export default router;
