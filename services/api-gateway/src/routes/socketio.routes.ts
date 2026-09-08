import express from "express";
import { proxyRequest } from "../services/socketio.service";

const router = express.Router();

router.use("/emit-event", proxyRequest);


export default router;


