import { Router } from "express";
import { validate } from "../middleware/validate.middleware";
import { 
  registerHospitalSchema, 
  loginHospitalSchema, 
  loginWithPhoneSchema, 
  verifyOtpSchema, 
  changePasswordSchema,
  loginWithEmailSchema,
  resetPasswordSchema,
  sendCustomEmailSchema,
} from "../validators/hospital.validator";
import { 
  Registeration,
  login,
  loginWithPhone,
  sendOtp,
  verifyOtp,
  verifyLoginOtp,
  resetPassword,
  changePassword,
  getanHospital,
  getHospital,
  updateData,
  hospitalDelete,
  getBlacklistedHospitals,
  recoverHospital,
  refreshHospitalToken,
  logout,
  roleBaseLogin,
  roleBaseLogout,
  updateFcmTokenByEmail,
} from "../controllers/hospital.controllers";
import { authenticate } from "../middleware/authenticate";
import { checkPermission } from "../middleware/role.middleware";
import { verifyInternalRequest } from "../middleware/internalAuth";
import { updateHospitalPassword } from "../controllers/hospital.controllers";



const router = Router();

// Auth & Password Flow
router.post("/hospital",  validate(registerHospitalSchema), Registeration);
router.post("/hospital/login", validate(loginHospitalSchema), login);
router.post("/hospital/login/phone", validate(loginWithPhoneSchema), loginWithPhone);
router.post("/hospital/otp",validate(verifyOtpSchema),verifyLoginOtp)



// Production Auth Routes
router.post("/hospital/auth/send-otp", validate(loginWithEmailSchema), sendOtp);
router.post("/hospital/auth/verify-otp", validate(verifyOtpSchema), verifyOtp);
router.post("/hospital/auth/reset-password",   validate(resetPasswordSchema), resetPassword);

router.put("/hospital/auth/change-password", authenticate, checkPermission("hospital", "edit"), validate(changePasswordSchema), changePassword);
router.post("/hospital/refresh", refreshHospitalToken);
router.post("/hospital/logout/:id", authenticate, checkPermission("hospital", "create"),  logout);



// CRUD 


router.get("/hospital",  getHospital);
router.get("/hospital/blacklist", authenticate, checkPermission("hospital", "view"),  getBlacklistedHospitals);
router.get("/hospital/:id",  getanHospital);
router.put("/hospital/recover/:id", authenticate, checkPermission("hospital", "edit"), recoverHospital);
router.put("/hospital/:id", updateData);

router.put(
  "/internal/hospital/:id/password",
  verifyInternalRequest,
  updateHospitalPassword
);


router.delete("/hospital/:id",authenticate,checkPermission("hospital","delete"), hospitalDelete);

router.post("/hospital/g-login", roleBaseLogin);
router.post("/hospital/g-logout", roleBaseLogout);
router.post("/hospital/update-fcm-token", updateFcmTokenByEmail);



export default router;




