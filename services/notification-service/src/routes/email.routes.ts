import express from "express";
import {
  saveDraft,
  sendEmailNotification,
  sendDraft,
  getEmailNotifications,
  getEmailNotificationById,
  updateEmailNotification,
  deleteEmailNotification,
  duplicateEmail,
  resendEmail,
  archiveEmail,
  unarchiveEmail,
  getRecipientsByRoles,
} from "../controllers/email.controller";
import { authenticate } from "../middleware/authenticate";
import { checkPermission } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createEmailNotificationSchema,
  updateEmailNotificationSchema,
  saveDraftSchema,
} from "../validations/email.validation";

const router = express.Router();

// ── Save Draft ──
router.post(
  "/draft",
  validate(saveDraftSchema),
  authenticate,
  checkPermission("email", "create"),
  saveDraft
);

// ── Send Email (new, directly) ──
router.post(
  "/send-email",
  validate(createEmailNotificationSchema),
  authenticate,
  checkPermission("email", "create"),
  sendEmailNotification
);

// ── Send a saved Draft ──
router.post(
  "/send-draft/:id",
  authenticate,
  checkPermission("email", "create"),
  sendDraft
);

// ── List all emails ──
router.get(
  "/",
  authenticate,
  checkPermission("email", "view"),
  getEmailNotifications
);

// ── Get single email ──
router.get(
  "/:id",
  authenticate,
  checkPermission("email", "view"),
  getEmailNotificationById
);

// ── Update (DRAFT only) ──
router.put(
  "/:id",
  validate(updateEmailNotificationSchema),
  authenticate,
  checkPermission("email", "edit"),
  updateEmailNotification
);

// ── Delete (DRAFT only) ──
router.delete(
  "/:id",
  authenticate,
  checkPermission("email", "delete"),
  deleteEmailNotification
);

// ── Duplicate (creates a copy as DRAFT) ──
router.post(
  "/duplicate/:id",
  authenticate,
  checkPermission("email", "create"),
  duplicateEmail
);

// ── Resend (creates a new copy & sends) ──
router.post(
  "/resend/:id",
  authenticate,
  checkPermission("email", "create"),
  resendEmail
);

// ── Archive ──
router.patch(
  "/archive/:id",
  authenticate,
  checkPermission("email", "edit"),
  archiveEmail
);

// ── Unarchive ──
router.patch(
  "/unarchive/:id",
  authenticate,
  checkPermission("email", "edit"),
  unarchiveEmail
);

// ── Get Recipients by Roles ──
router.post(
  "/recipients-by-roles",
  authenticate,
  checkPermission("email", "view"),
  getRecipientsByRoles
);

export default router;
