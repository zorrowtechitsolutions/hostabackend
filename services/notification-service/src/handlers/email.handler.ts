import { env } from "../config/env";
import axios from "axios";
import nodemailer from "nodemailer";
import EmailNotification from "../models/email.model";
import { safeSocketEmit } from "../utils/socket.emitter";
import Notification from "../models/notification.model";

export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    }
});

export const handleEmailEvent = async (
    routingKey: string,
    content: any
) => {
    try {
        const { notificationId, hospitalId, recipients, subject, message, createdBy } = content;

        const emitEmailStatus = (event: string, message: string, data: any) => {
            const payload = { event, message, data };
            if (hospitalId) {
                safeSocketEmit(`hospital_${hospitalId}`, "email_event", payload);
            }
            if (createdBy) {
                safeSocketEmit(`staff_${createdBy}`, "email_event", payload);
                safeSocketEmit(`user_${createdBy}`, "email_event", payload);
            }
        };

        // ── Emit "SENDING" socket event ──
        emitEmailStatus("EMAIL_SENDING", `Sending email: "${subject}"...`, {
            notificationId,
            subject,
            status: "SENDING",
        });

        let allEmails: any[] = [];

        if (recipients && Array.isArray(recipients)) {
            for (const recipient of recipients) {
                const { roleId, all, userIds, userId } = recipient;
                // Accept both userIds (plural) and userId (singular) for backward compatibility
                const targetUserIds = userIds || userId || [];

                if (all) {
                    // Fetch ALL users for this role
                    try {
                        const doctorsRes = await axios.post(
                            `${process.env.DOCTOR_SERVICE_URL || process.env.DOCTOR_SERVICE}/doctor/emails-by-roles`,
                            { roleIds: [roleId], hospitalId },
                            { timeout: 5000 }
                        );
                        if (Array.isArray(doctorsRes.data)) {
                            allEmails.push(...doctorsRes.data);
                        } else if (doctorsRes.data?.data && Array.isArray(doctorsRes.data.data)) {
                            allEmails.push(...doctorsRes.data.data);
                        }
                    } catch {
                        // Ignore lookup failures for this recipient.
                    }

                    try {
                        const staffRes = await axios.post(
                            `${process.env.STAFF_SERVICE_URL || process.env.STAFF_SERVICE}/staff/emails-by-roles`,
                            { roleIds: [roleId], hospitalId },
                            { timeout: 5000 }
                        );
                        if (Array.isArray(staffRes.data)) {
                            allEmails.push(...staffRes.data);
                        } else if (staffRes.data?.data && Array.isArray(staffRes.data.data)) {
                            allEmails.push(...staffRes.data.data);
                        }
                    } catch {
                        // Ignore lookup failures for this recipient.
                    }
                } else if (targetUserIds && targetUserIds.length > 0) {
                    // Fetch SPECIFIC users for this role
                    try {
                        const doctors = await axios.post(
                            `${process.env.DOCTOR_SERVICE_URL || process.env.DOCTOR_SERVICE}/doctor/emails`,
                            { ids: targetUserIds, roleId, hospitalId },
                            { timeout: 5000 }
                        );
                        if (Array.isArray(doctors.data)) {
                            allEmails.push(...doctors.data);
                        } else if (doctors.data?.data && Array.isArray(doctors.data.data)) {
                            allEmails.push(...doctors.data.data);
                        }
                    } catch {
                        // Ignore lookup failures for this recipient.
                    }

                    try {
                        const staffs = await axios.post(
                            `${process.env.STAFF_SERVICE_URL || process.env.STAFF_SERVICE}/staff/emails`,
                            { ids: targetUserIds, roleId, hospitalId },
                            { timeout: 5000 }
                        );
                        if (Array.isArray(staffs.data)) {
                            allEmails.push(...staffs.data);
                        } else if (staffs.data?.data && Array.isArray(staffs.data.data)) {
                            allEmails.push(...staffs.data.data);
                        }
                    } catch {
                        // Ignore lookup failures for this recipient.
                    }
                }
            }
        }

        // Deduplicate by email address
        const uniqueEmails = Array.from(
            new Map(allEmails.filter(u => u && u.email).map(u => [u.email, u])).values()
        );

        if (uniqueEmails.length === 0) {
            if (notificationId) {
                await EmailNotification.update(
                    { status: "FAILED", failedCount: 0, totalRecipients: 0 },
                    { where: { id: notificationId } }
                );
            }

            // ── Emit "FAILED" socket event (no recipients found) ──
            emitEmailStatus("EMAIL_FAILED", `Email "${subject}" failed: No recipients found`, {
                notificationId,
                subject,
                status: "FAILED",
                reason: "No recipients found",
            });

            return;
        }

        // Update totalRecipients with actual resolved count
        if (notificationId) {
            await EmailNotification.update(
                { totalRecipients: uniqueEmails.length },
                { where: { id: notificationId } }
            );
        }

        const results = await Promise.allSettled(
            uniqueEmails.map(user => {
                return transporter.sendMail({
                    from: process.env.SMTP_USER || "crmprojectmailer123@gmail.com",
                    to: user.email,
                    subject: subject,
                    html: message
                });
            })
        );

        let successCount = 0;
        let failedCount = 0;

        results.forEach((result, idx) => {
            if (result.status === "fulfilled") {
                successCount++;
            } else {
                failedCount++;
            }
        });

        const finalStatus = failedCount > 0 ? (successCount > 0 ? "PARTIAL" : "FAILED") : "SUCCESS";

        if (notificationId) {
            await EmailNotification.update(
                { 
                    status: finalStatus,
                    successCount,
                    failedCount
                },
                { where: { id: notificationId } }
            );
        }

        // ── Persist email notification to Notification table ──
        try {
            await Notification.create({
                hospitalIds: hospitalId ? [hospitalId] : [],
                staffIds: createdBy ? [createdBy] : [],
                message: finalStatus === "SUCCESS"
                    ? `Email "${subject}" sent successfully to ${successCount} recipient(s)`
                    : finalStatus === "PARTIAL"
                        ? `Email "${subject}" partially sent: ${successCount} succeeded, ${failedCount} failed`
                        : `Email "${subject}" failed to send to all ${failedCount} recipient(s)`,
                metadata: {
                    type: "EMAIL",
                    event: `EMAIL_${finalStatus}`,
                    notificationId,
                    subject,
                    successCount,
                    failedCount,
                    totalRecipients: uniqueEmails.length,
                },
            });
        } catch (persistErr) {
            console.error("Failed to persist email notification:", persistErr);
        }

        // ── Emit final status socket event ──
        const socketEvent = finalStatus === "SUCCESS" ? "EMAIL_SUCCESS"
            : finalStatus === "PARTIAL" ? "EMAIL_PARTIAL"
            : "EMAIL_FAILED";

        const socketMessage = finalStatus === "SUCCESS"
            ? `Email "${subject}" sent successfully to ${successCount} recipient(s)`
            : finalStatus === "PARTIAL"
                ? `Email "${subject}": ${successCount} sent, ${failedCount} failed`
                : `Email "${subject}" failed to send`;

        emitEmailStatus(socketEvent, socketMessage, {
            notificationId,
            subject,
            status: finalStatus,
            successCount,
            failedCount,
            totalRecipients: uniqueEmails.length,
        });
    } catch (error: any) {
        if (content.notificationId) {
            await EmailNotification.update(
                { status: "FAILED" },
                { where: { id: content.notificationId } }
            ).catch(() => undefined);
        }

        // ── Emit error socket event ──
        if (content?.hospitalId) {
            safeSocketEmit(`hospital_${content.hospitalId}`, "email_event", {
                event: "EMAIL_FAILED",
                message: `Email "${content.subject}" failed: ${error.message}`,
                data: {
                    notificationId: content.notificationId,
                    subject: content.subject,
                    status: "FAILED",
                    error: error.message,
                },
            });
        }
        if (content?.createdBy) {
            safeSocketEmit(`staff_${content.createdBy}`, "email_event", {
                event: "EMAIL_FAILED",
                message: `Email "${content.subject}" failed: ${error.message}`,
                data: {
                    notificationId: content.notificationId,
                    subject: content.subject,
                    status: "FAILED",
                    error: error.message,
                },
            });
            safeSocketEmit(`user_${content.createdBy}`, "email_event", {
                event: "EMAIL_FAILED",
                message: `Email "${content.subject}" failed: ${error.message}`,
                data: {
                    notificationId: content.notificationId,
                    subject: content.subject,
                    status: "FAILED",
                    error: error.message,
                },
            });
        }

        throw error;
    }
};
