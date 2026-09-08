import { Router } from "express";
import {
  Registeration,
  loginWithPhone,
  verifyOtp,
  getanAmbulace,
  updateData,
  ambulanceDelete,
  getAmbulaces,
} from "../controllers/ambulance.controllers";
import { validate, validateParams } from "../middleware/validate.middleware";
import {
  registerSchema,
  loginWithPhoneSchema,
  verifyOtpSchema,
  updateSchema,
  idParamSchema,
} from "../validators/ambulance.validator";
import { authenticate } from "../middleware/authenticate";
import { checkPermission } from "../middleware/role.middleware";

const router = Router();

// Auth 
router.post("/ambulance", authenticate, validate(registerSchema), Registeration);
router.post("/ambulance/login/phone",  validate(loginWithPhoneSchema), loginWithPhone);
router.post("/ambulance/otp", validate(verifyOtpSchema), verifyOtp);

// CRUD
router.get("/ambulance", getAmbulaces);
router.get("/ambulance/:id", authenticate, validateParams(idParamSchema),checkPermission("ambulance", "view"), getanAmbulace);
router.put("/ambulance/:id", authenticate, validateParams(idParamSchema), validate(updateSchema),checkPermission("ambulance", "edit"), updateData);
router.delete("/ambulance/:id", authenticate, validateParams(idParamSchema),checkPermission("ambulance", "delete"), ambulanceDelete);

export default router;
