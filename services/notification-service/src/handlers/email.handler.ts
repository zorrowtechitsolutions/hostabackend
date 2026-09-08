import { env } from "../config/env";
import axios from "axios";
import nodemailer from "nodemailer";
import EmailNotification from "../models/email.model";

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
        const { notificationId, hospitalId, recipients, subject, message } = content;

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

        if (notificationId) {
            await EmailNotification.update(
                { 
                    status: failedCount > 0 ? (successCount > 0 ? "PARTIAL" : "FAILED") : "SUCCESS",
                    successCount,
                    failedCount
                },
                { where: { id: notificationId } }
            );
        }
    } catch (error: any) {
        if (content.notificationId) {
            await EmailNotification.update(
                { status: "FAILED" },
                { where: { id: content.notificationId } }
            ).catch(() => undefined);
        }
        throw error;
    }
};
