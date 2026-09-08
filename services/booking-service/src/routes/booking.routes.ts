import { Router } from "express";
import {
  Registeration,
  getanBooking,
  updateData,
  bookingDelete,
  getBookings,
  autoDeclineBooking,
  getTodayCount
} from "../controllers/booking.controllers";
import { authenticate } from "../middleware/authenticate";
import { checkPermission } from "../middleware/role.middleware";

const router = Router();

// CRUD - Accessible by authenticated Users and Staff
router.post("/booking", authenticate,  Registeration);
router.get("/booking", authenticate, checkPermission("booking", "view" ), getBookings);
router.get("/booking/:id", authenticate, checkPermission("booking", "view" ),  getanBooking);
router.put("/booking/:id", authenticate, checkPermission("booking", "edit" ), updateData);
router.delete("/booking/:id", authenticate, checkPermission("booking", "delete" ), bookingDelete);

// INTERNAL API (called by bulmq worker or other services)
router.put("/booking/internal/:id/auto-decline", autoDeclineBooking);
router.get("/booking/internal/doctor/:doctorId/today-count", getTodayCount);

export default router;

