import { Router } from 'express';
import {
  login,
  loginWithPhone,
  verifyLoginOtp,
  sendOtp,
  verifyOtp,
  resetPassword,
  changePassword,
  refreshHospitalToken,
  logout,
  register,
  deleteAuth,
  update,
  getAuthByid,
  selectHospital,
  toggleNotificationStatus
} from '../controllers/auth.controller';
import { getAuditLogs } from '../controllers/audit.controller';
import { authenticate, checkPermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import {
  loginHospitalSchema,
  loginWithPhoneSchema,
  verifyOtpSchema,
  loginWithEmailSchema,
  resetPasswordSchema,
  changePasswordSchema,
  registerSchema,
  updateSchema
} from '../validators/auth.validator';
import { verifyInternalRequest } from "../middleware/auth.middleware";
import { internalUpdateStaffPassword } from "../controllers/auth.controller";

// import { verifyInternalRequest } from "../middleware/auth.middleware";
import { internalUpdateDoctorPassword} from "../controllers/auth.controller";



const router = Router();

// Auth & Password Flow
router.post("/login", validate(loginHospitalSchema), login);
router.post("/login/phone", validate(loginWithPhoneSchema), loginWithPhone);
router.post("/otp", validate(verifyOtpSchema), verifyLoginOtp);
router.post("/", validate(registerSchema), register);
router.post("/select-hospital", authenticate, selectHospital);
router.put("/notification/toggle", authenticate, toggleNotificationStatus);

router.put("/:id/role/:roles", update);
router.delete("/:id/role/:roles", deleteAuth);
router.get("/:id/role/:roles",  getAuthByid);

router.get("/audit-logs/:hospitalId", authenticate,
  checkPermission("audit log", "view"),
   getAuditLogs);





router.put(
  "/internal/staff/:id/password",
  verifyInternalRequest,
  internalUpdateStaffPassword
);



router.put(
  "/internal/doctor/:id/password",
  verifyInternalRequest,
  internalUpdateDoctorPassword
);


// Production Auth Routes
router.post("/send-otp", validate(loginWithEmailSchema), sendOtp);
router.post("/verify-otp", validate(verifyOtpSchema), verifyOtp);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

router.put("/change-password", authenticate, validate(changePasswordSchema), changePassword);
router.post("/refresh", refreshHospitalToken);
router.post("/logout/:id", authenticate, logout);

export default router;







