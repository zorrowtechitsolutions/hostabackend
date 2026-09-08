import { Router } from "express";

import { authenticate } from "../middleware/authenticate";
import { assignTaskBooking } from "../controllers/booking-remainder-user.controllers";

const router = Router();




// CRUD

router.post(
  "/booking-task/users",
  authenticate,
 assignTaskBooking
);



export default router;