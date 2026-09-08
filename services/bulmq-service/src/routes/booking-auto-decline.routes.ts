import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { assignAutoDecline, removeAutoDecline } from "../controllers/booking-auto-decline.controllers";

const router = Router();

router.post(
  "/booking-task/auto-decline",
  authenticate,
  assignAutoDecline
);

router.post(
  "/booking-task/auto-decline/cancel",
  authenticate,
  removeAutoDecline
);

export default router;
