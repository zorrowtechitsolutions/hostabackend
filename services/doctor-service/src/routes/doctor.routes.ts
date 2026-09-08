import { Router } from "express";
import {
  Registeration,
  login,
  loginWithPhone,
  verifyOtp,
  getanDoctor,
  getDoctorHospitals,
  updateData,
  doctorDelete,
  getDoctors,
  getBlacklistedDoctors,
  recoverDoctor,
  changepassword,
  sendDoctorOtp,
  verifyDoctorOtp,
  resetDoctorPassword,
  changeDoctorPassword,
  refreshDoctorToken,
  logout,
  updateFcmTokenByEmail,
  getDoctorEmails,
  getDoctorEmailsByRoles
} from "../controllers/doctor.controllers";
import { validate } from "../middleware/validate.middleware";
import { 
  registerDoctorSchema, 
  loginDoctorSchema, 
  loginWithPhoneSchema, 
  loginWithEmailSchema,
  verifyOtpSchema, 
  resetPasswordSchema,
  changePasswordSchema 
} from "../validators/doctor.validator";
import { authenticate } from "../middleware/authenticate";
import { checkPermission } from "../middleware/role.middleware";
import { check } from "zod";
import { verifyInternalRequest } from "../middleware/internalAuth";
import { updateDoctorPassword } from "../controllers/doctor.controllers";
import { validateParams } from "../middleware/validate.middleware";
import { idParamSchema } from "../validators/doctor.validator";

const router = Router();



// Auth
router.post("/doctor", authenticate, checkPermission("doctor", "create"),  validate(registerDoctorSchema), Registeration);
router.post("/doctor/login", validate(loginDoctorSchema), login);
router.post("/doctor/login/phone", validate(loginWithPhoneSchema), loginWithPhone);
router.post("/doctor/otp", validate(verifyOtpSchema), verifyOtp);
                  
// Production Auth Pattern
router.post("/doctor/auth/send-otp", validate(loginWithEmailSchema), sendDoctorOtp);
router.post("/doctor/auth/verify-otp", validate(verifyOtpSchema), verifyDoctorOtp);
router.post("/doctor/auth/reset-password", validate(resetPasswordSchema), resetDoctorPassword);
router.put("/doctor/auth/change-password", authenticate, validate(changePasswordSchema),checkPermission('doctor','edit'), changeDoctorPassword);





router.put(
  "/doctor/auth/change-password/:id",
  authenticate,
  validateParams(idParamSchema),
  validate(changePasswordSchema),
  checkPermission('doctor', 'edit'),
  changeDoctorPassword
);






router.post("/doctor/refresh", refreshDoctorToken);
router.post("/doctor/logout/:id",authenticate, checkPermission("doctor", "create"), logout);
router.post("/doctor/update-fcm-token", updateFcmTokenByEmail);

// Legacy/Alternative (Keeping for compatibility but securing)
// router.put("/doctor/change-password", authenticate, validate(changePasswordSchema), changeDoctorPassword);









router.put("/doctor/internal/:id/password", verifyInternalRequest, updateDoctorPassword);
router.get("/doctor/internal/:id",verifyInternalRequest, validateParams(idParamSchema), getanDoctor);
router.get("/doctor/internal/:id/hospitals", verifyInternalRequest, validateParams(idParamSchema), getDoctorHospitals);



// CRUD

router.get("/doctor", getDoctors);
router.get("/doctor/blacklist", authenticate, checkPermission('doctor', 'view'), getBlacklistedDoctors);
router.get("/doctor/:id", getanDoctor);
router.put("/doctor/recover/:id", authenticate, checkPermission('doctor', 'edit'), recoverDoctor);
router.put("/doctor/:id", authenticate, checkPermission('doctor','edit'), updateData);

// router.put(
//   "/internal/doctor/:id/password",
//   verifyInternalRequest,  
//   updateDoctorPassword
// );


router.delete("/doctor/:id", authenticate, checkPermission('doctor','delete'), doctorDelete);

router.post("/doctor/emails", getDoctorEmails);
router.post("/doctor/emails-by-roles", getDoctorEmailsByRoles);

export default router;

