import express from "express";
import { proxyRequest } from "../services/hospital.service";

const router = express.Router();

router.use("/hospital", proxyRequest);
router.use("/prescription-template", proxyRequest);




export default router;
