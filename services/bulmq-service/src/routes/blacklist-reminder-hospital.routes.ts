import { Router } from "express";

import { authenticate } from "../middleware/authenticate";

import { assignBlacklistReminderHospital } from "../controllers/blacklist-reminder-hospital.controller";

const router = Router();

router.post(
  "/blacklist-reminder/hospital",
  authenticate,
  assignBlacklistReminderHospital
);

export default router;