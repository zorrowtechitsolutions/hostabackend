import { Router } from "express";
import {
  createDonor,
  loginWithPhone,
  verifyOtp,
  getDonors,
  getSingleDonor,
  updateDonor,
  deleteDonor,
} from "../controllers/bloodDonor.controller";
import { validate, validateParams } from "../middleware/validate.middleware";
import { donorSchema, idParamSchema, phoneLoginSchema, otpSchema } from "../validators/blood.validator";
import { authenticate } from "../middleware/authenticate";
import { checkPermission } from "../middleware/role.middleware";

const router = Router();

// 🔐 Auth Routes
router.post("/donors/login/phone", validate(phoneLoginSchema), loginWithPhone);
router.post("/donors/otp", validate(otpSchema), verifyOtp);

// 🛡️ Protected - Only authenticated users can register as donors
router.post("/donors", authenticate, validate(donorSchema), checkPermission("donors", "create"), createDonor);

// 📋 CRUD Routes
router.get("/donors",  getDonors);
router.get("/donors/:id",authenticate, validateParams(idParamSchema), checkPermission("donors", "view"), getSingleDonor);
router.put("/donors/:id",authenticate, validateParams(idParamSchema), checkPermission("donors", "edit"), updateDonor);
router.delete("/donors/:id",authenticate, validateParams(idParamSchema), checkPermission("donors", "delete"), deleteDonor);

export default router;












