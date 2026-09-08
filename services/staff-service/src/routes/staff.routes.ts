import { Router } from "express";
import {
  Registeration,
  login,
  loginWithPhone,
  verifyOtp,
  getanStaff,
  getStaffHospitals,
  updateData,
  staffDelete,
  getStaffs,
  getBlacklistedStaffs,
  recoverStaff,
  changepassword,
  sendStaffOtp,
  verifyStaffOtp,
  resetStaffPassword,
  changeStaffPassword,
  refreshStaffToken,
  logout,
  updateFcmTokenByEmail,
  updateStaffPassword,
  getStaffEmails,
  getStaffEmailsByRoles
} from "../controllers/staff.controllers";

import { validate, validateParams } from "../middleware/validate.middleware";
import {
  registerStaffSchema,
  loginStaffSchema,
  loginWithPhoneSchema,
  loginWithEmailSchema,
  verifyOtpSchema,
  idParamSchema,
  updateStaffSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../validators/staff.validator";
import { authenticate } from "../middleware/authenticate";
import { checkPermission } from "../middleware/role.middleware";
import { verifyInternalRequest } from "../middleware/internalAuth";



const router = Router();

// Auth

router.post("/staff", authenticate, validate(registerStaffSchema),checkPermission("staff", "create"), Registeration);
router.post("/staff/login", validate(loginStaffSchema), login);
router.post("/staff/login/phone", validate(loginWithPhoneSchema), loginWithPhone);
router.post("/staff/otp", validate(verifyOtpSchema), verifyOtp);
router.post("/staff/refresh", refreshStaffToken);
router.post("/staff/logout/:id",authenticate, checkPermission("staff", "create"), logout);
router.post("/staff/update-fcm-token", updateFcmTokenByEmail);
// router.post("/staff/password", changepassword);




router.post("/staff/auth/send-otp", validate(loginWithEmailSchema), sendStaffOtp);

router.post("/staff/auth/verify-otp", validate(verifyOtpSchema), verifyStaffOtp);

router.post("/staff/auth/reset-password", validate(resetPasswordSchema), resetStaffPassword);

// router.put("/staff/auth/change-password",authenticate, validate(changePasswordSchema),checkPermission("staff", "edit"),changeStaffPassword);

router.put(
  "/staff/auth/change-password/:id",
  authenticate,
  validateParams(idParamSchema),
  validate(changePasswordSchema),
  checkPermission("staff", "edit"),
  changeStaffPassword
);


// CRUD

router.get("/staff",authenticate,checkPermission("staff", "view"),getStaffs);
router.get("/staff/blacklist", authenticate, checkPermission("staff", "view"), getBlacklistedStaffs);
router.get("/staff/:id",authenticate, validateParams(idParamSchema), checkPermission("staff", "view"),getanStaff);
router.put("/staff/recover/:id", authenticate, checkPermission("staff", "edit"), recoverStaff);
router.put("/staff/:id",authenticate, validateParams(idParamSchema), validate(updateStaffSchema), checkPermission("staff", "edit"), updateData);









router.put("/staff/internal/:id/password", verifyInternalRequest, updateStaffPassword);
router.get("/staff/internal/:id",verifyInternalRequest, validateParams(idParamSchema), getanStaff);
router.get("/staff/internal/:id/hospitals", verifyInternalRequest, validateParams(idParamSchema), getStaffHospitals);








router.delete("/staff/:id",authenticate, validateParams(idParamSchema), checkPermission("staff", "delete"), staffDelete);

router.post("/staff/emails", getStaffEmails);
router.post("/staff/emails-by-roles", getStaffEmailsByRoles);

export default router;








