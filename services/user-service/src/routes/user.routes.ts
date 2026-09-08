import { Router } from "express";
import {
  registerUser,
  loginUser,
  loginWithPhone,
  verifyOtp,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  sendOtpEmail,
  verifyOtpEmail,
  resetPasswordEmail,
  changePassword,
  saveExpoToken,
  testPushNotification,
  createPatient,
  getPatients,
  getPatient,
  updatePatient,
  deletePatient,
  getBlacklistedPatients,
  recoverUser,
  recoverPatient,
  refreshUserToken,
  logout,
  getBlacklistedUsers,
  sendEnquiry
} from "../controllers/user.controller";

import {
  createPrescription,
  getPrescription,
  getAPrescription,
  deletePrescription,
  updateData
} from "../controllers/prescription.controller";

import {
addVitals,
deleteVitals,
getLatestVitals,
getVitalsById,
getVitalsByPatient,
updateVitals

} from "../controllers/patientVitals.controller";

import {
  createLabResult,
  getLabResults,
  getLabResult,
  updateLabResult,
  deleteLabResult,
} from "../controllers/labResult.controller";

import {
  createDocument,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
} from "../controllers/document.controller";

import { validate, validateParams } from "../middleware/validate.middleware";
import { registerSchema, loginSchema, idParamSchema, loginWithPhoneSchema, verifyOtpSchema, updateUserSchema, sendOtpEmailSchema, verifyOtpEmailSchema, resetPasswordEmailSchema, changePasswordSchema } from "../validators/user.validator";
import { createPatientSchema, updatePatientSchema } from "../validators/patient.validator";
import { authenticate, restrictTo } from "../middleware/authenticate";
import { checkPermission } from "../middleware/role.middleware";

const router = Router();                              

// User Routes
router.post("/users", validate(registerSchema), registerUser);
router.post("/users/login", validate(loginSchema), loginUser);
router.post("/users/login/phone", validate(loginWithPhoneSchema), loginWithPhone);
router.post("/users/otp", validate(verifyOtpSchema), verifyOtp);
// router.post("/users/password", resetPassword);

// Email Password Reset Flow
router.post("/users/auth/send-otp", validate(sendOtpEmailSchema), sendOtpEmail);
router.post("/users/auth/verify-otp", validate(verifyOtpEmailSchema), verifyOtpEmail);
router.post("/users/auth/reset-password",  validate(resetPasswordEmailSchema), resetPasswordEmail);
router.put("/users/auth/change-password", authenticate, checkPermission("users", "edit"), validate(changePasswordSchema), changePassword);

// Refresh and Logout
router.post("/users/refresh", refreshUserToken);
router.post("/users/logout/:id", authenticate, checkPermission("users", "create"), logout);

router.get("/users", authenticate,   getUsers);
router.get("/users/blacklist", authenticate, getBlacklistedUsers);
router.get("/internal/users/:id", validateParams(idParamSchema), getUser);
router.get("/users/:id", authenticate, validateParams(idParamSchema), (req: any, res: any, next: any) => {
  if (req.user.id === parseInt(req.params.id)) {
    return next();
  }
  return checkPermission("users", "view")(req, res, next);
}, getUser);
router.put("/users/recover/:id", authenticate, checkPermission("users", "edit"), recoverUser);
router.put("/users/:id", authenticate, validateParams(idParamSchema), validate(updateUserSchema), checkPermission("users", "edit"), updateUser);
router.delete("/users/:id", authenticate, validateParams(idParamSchema), checkPermission("users", "delete"), deleteUser);




// Patient Routes
router.post("/patients", authenticate, checkPermission("patient", "create"), validate(createPatientSchema), createPatient);
router.get("/patients", authenticate, checkPermission("patient", "view"), getPatients);
router.get("/patients/blacklist", authenticate, checkPermission("patient", "view"), getBlacklistedPatients);
router.get("/patients/:id", authenticate, checkPermission("patient", "view"), validateParams(idParamSchema), getPatient);
router.put("/patients/recover/:id", authenticate, checkPermission("patient", "edit"), recoverPatient);
router.put("/patients/:id", authenticate, checkPermission("patient", "edit"), validateParams(idParamSchema), validate(updatePatientSchema), updatePatient);
router.delete("/patients/:id", authenticate, checkPermission("patient", "delete"), validateParams(idParamSchema), deletePatient);



// Prescription

router.post("/prescription",  authenticate, checkPermission("prescription", "create"),  createPrescription);
router.get("/prescription", authenticate, checkPermission("prescription", "view"), getPrescription);
router.get("/prescription/:id", authenticate, checkPermission("prescription", "view"), getAPrescription);
router.put("/prescription/:id", authenticate, checkPermission("prescription", "edit"), updateData);
router.delete("/prescription/:id", authenticate, checkPermission("prescription", "delete"), deletePrescription);


router.post("/vitals", authenticate, checkPermission("vitals", "create"),  addVitals);
router.get("/vitals/:id", authenticate, checkPermission("vitals", "view"), getVitalsById);
router.put("/vitals/:id", authenticate, checkPermission("vitals", "edit"), updateVitals);
router.get("/vitals/patient/:patientId", authenticate, checkPermission("vitals", "view"), getVitalsByPatient);
router.get("/vitals", authenticate, checkPermission("vitals", "view"), getLatestVitals);
router.delete("/vitals/:id", authenticate, checkPermission("vitals", "delete"), deleteVitals);

  
// Lab Result
router.post("/lab-results", authenticate, checkPermission("labresult", "create"), createLabResult);
router.get("/lab-results", authenticate, checkPermission("labresult", "view"), getLabResults);
router.get("/lab-results/:id", authenticate, validateParams(idParamSchema), checkPermission("labresult", "view"), getLabResult);
router.put("/lab-results/:id", authenticate, validateParams(idParamSchema), checkPermission("labresult", "edit"), updateLabResult);
router.delete("/lab-results/:id", authenticate, validateParams(idParamSchema), checkPermission("labresult", "delete"), deleteLabResult);

// Document
router.post("/documents", authenticate, checkPermission("document", "create"), createDocument);
router.get("/documents", authenticate, checkPermission("document", "view"), getDocuments);
router.get("/documents/:id", authenticate, validateParams(idParamSchema), checkPermission("document", "view"), getDocument);
router.put("/documents/:id", authenticate, validateParams(idParamSchema), checkPermission("document", "edit"), updateDocument);
router.delete("/documents/:id", authenticate, validateParams(idParamSchema), checkPermission("document", "delete"), deleteDocument);

router.post("/email-enquiry", authenticate,   sendEnquiry);


export default router;








