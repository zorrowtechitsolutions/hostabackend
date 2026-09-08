import { Router } from "express";

import { authenticate } from "../middleware/authenticate";
import { assignTaskBookingHospital } from "../controllers/booking-remainder-hospital.controllers";

const router = Router();






router.post(
  "/booking-task/hospital",
  authenticate,
 assignTaskBookingHospital
);

export default router;