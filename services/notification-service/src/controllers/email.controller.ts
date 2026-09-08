import { Request, Response } from "express";
import * as EmailService from "../services/email.service";
import asyncHandler from "express-async-handler";
import axios from "axios";

// ── Save Draft ──
export const saveDraft: any = asyncHandler(async (
    req: any,
    res: Response
): Promise<any> => {
    const draft = await EmailService.saveDraft({
        hospitalId: req.user.hospitalId,
        createdBy: req.user.id,
        ...req.body
    });

    return res.status(201).json({
        success: true,
        message: "Draft saved successfully.",
        data: draft
    });
});

// ── Send Email (new) ──
export const sendEmailNotification: any = asyncHandler(async (
    req: any,
    res: Response
): Promise<any> => {
    const {
        recipients,
        subject,
        message,
        templateId
    } = req.body;

    await EmailService.sendEmailNotification({
        hospitalId: req.user.hospitalId,
        createdBy: req.user.id,
        recipients,
        subject,
        message,
        templateId
    });

    return res.status(202).json({
        success: true,
        message: "Email notification queued successfully."
    });
});

// ── Send a Draft ──
export const sendDraft: any = asyncHandler(async (
    req: any,
    res: Response
): Promise<any> => {
    const notificationId = Number(req.params.id);
    if (Number.isNaN(notificationId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email notification ID",
        });
    }

    const result = await EmailService.sendDraft(notificationId, req.user.hospitalId);

    if (!result) {
        return res.status(404).json({
            success: false,
            message: "Draft not found or already sent",
        });
    }

    return res.status(202).json({
        success: true,
        message: "Draft email queued for sending.",
        data: result
    });
});

// ── Helper to ensure single string from query param ──
const getQueryString = (queryParam: any): string | undefined => {
    if (Array.isArray(queryParam)) {
        return queryParam[0] as string;
    }
    return queryParam as string | undefined;
};

// ── List ──
export const getEmailNotifications: any = asyncHandler(async (
    req: any,
    res: Response
): Promise<any> => {
    const page = parseInt(getQueryString(req.query.page) || "1", 10);
    const limit = parseInt(getQueryString(req.query.limit) || "20", 10);
    const offset = (page - 1) * limit;

    const search = getQueryString(req.query.search);
    let status = getQueryString(req.query.status);
    if (status) {
        status = status.toUpperCase();
    }
    const startDate = getQueryString(req.query.startDate);
    const endDate = getQueryString(req.query.endDate);
    const hospitalId = req.user?.hospitalId;

    const { count, rows } = await EmailService.getEmailNotifications({
        limit,
        offset,
        search,
        status,
        startDate,
        endDate,
        hospitalId,
    });

    return res.status(200).json({
        success: true,
        data: rows,
        pagination: {
            total: count,
            page,
            pages: Math.ceil(count / limit),
            limit,
        },
    });
});

// ── Get by ID ──
export const getEmailNotificationById: any = asyncHandler(async (
    req: Request,
    res: Response
): Promise<any> => {
    const notificationId = Number(req.params.id);
    if (Number.isNaN(notificationId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email notification ID",
        });
    }

    const notification = await EmailService.getEmailNotificationById(notificationId);

    if (!notification) {
        return res.status(404).json({
            success: false,
            message: "Email notification not found",
        });
    }

    return res.status(200).json({
        success: true,
        data: notification,
    });
});

// ── Update ──
export const updateEmailNotification: any = asyncHandler(async (
    req: Request,
    res: Response
): Promise<any> => {
    const notificationId = Number(req.params.id);
    if (Number.isNaN(notificationId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email notification ID",
        });
    }

    const updated = await EmailService.updateEmailNotification(
        notificationId,
        req.body
    );

    if (!updated) {
        return res.status(404).json({
            success: false,
            message: "Email notification not found, not a draft, or not updated",
        });
    }

    return res.status(200).json({
        success: true,
        message: "Email notification updated successfully",
        data: updated,
    });
});

// ── Delete ──
export const deleteEmailNotification: any = asyncHandler(async (
    req: Request,
    res: Response
): Promise<any> => {
    const notificationId = Number(req.params.id);
    if (Number.isNaN(notificationId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email notification ID",
        });
    }

    const deleted = await EmailService.deleteEmailNotification(notificationId);

    if (!deleted) {
        return res.status(404).json({
            success: false,
            message: "Email notification not found or not a draft",
        });
    }

    return res.status(200).json({
        success: true,
        message: "Email notification deleted successfully",
    });
});

// ── Duplicate (creates a new DRAFT) ──
export const duplicateEmail: any = asyncHandler(async (
    req: any,
    res: Response
): Promise<any> => {
    const notificationId = Number(req.params.id);
    if (Number.isNaN(notificationId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email notification ID",
        });
    }

    const duplicate = await EmailService.duplicateEmail(notificationId);

    if (!duplicate) {
        return res.status(404).json({
            success: false,
            message: "Email notification not found",
        });
    }

    return res.status(201).json({
        success: true,
        message: "Email duplicated as draft successfully",
        data: duplicate,
    });
});

// ── Resend (creates a new copy and queues it) ──
export const resendEmail: any = asyncHandler(async (
    req: any,
    res: Response
): Promise<any> => {
    const notificationId = Number(req.params.id);
    if (Number.isNaN(notificationId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email notification ID",
        });
    }

    const resent = await EmailService.resendEmail(notificationId, req.user.hospitalId);

    if (!resent) {
        return res.status(404).json({
            success: false,
            message: "Email notification not found",
        });
    }

    return res.status(202).json({
        success: true,
        message: "Email resent and queued successfully",
        data: resent,
    });
});

// ── Archive ──
export const archiveEmail: any = asyncHandler(async (
    req: Request,
    res: Response
): Promise<any> => {
    const notificationId = Number(req.params.id);
    if (Number.isNaN(notificationId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email notification ID",
        });
    }

    const archived = await EmailService.archiveEmail(notificationId);

    if (!archived) {
        return res.status(404).json({
            success: false,
            message: "Email notification not found",
        });
    }

    return res.status(200).json({
        success: true,
        message: "Email archived successfully",
        data: archived,
    });
});

// ── Unarchive ──
export const unarchiveEmail: any = asyncHandler(async (
    req: Request,
    res: Response
): Promise<any> => {
    const notificationId = Number(req.params.id);
    if (Number.isNaN(notificationId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email notification ID",
        });
    }

    const unarchived = await EmailService.unarchiveEmail(notificationId);

    if (!unarchived) {
        return res.status(404).json({
            success: false,
            message: "Email notification not found",
        });
    }

    return res.status(200).json({
        success: true,
        message: "Email unarchived successfully",
        data: unarchived,
    });
});

// ── Get Recipients by Roles ──
export const getRecipientsByRoles: any = asyncHandler(async (
    req: any,
    res: Response
): Promise<any> => {
    try {
        const { roleIds } = req.body;
        const hospitalId = req.user.hospitalId;

        if (!roleIds || !Array.isArray(roleIds)) {
            return res.status(400).json({
                success: false,
                message: "roleIds array is required"
            });
        }

        let allRecipients: any[] = [];

        // Fetch doctor emails by roles
        try {
            const doctorsRes = await axios.post(
                `${process.env.DOCTOR_SERVICE_URL || process.env.DOCTOR_SERVICE}/doctor/emails-by-roles`,
                { roleIds, hospitalId }
            );
            if (Array.isArray(doctorsRes.data)) {
                allRecipients.push(...doctorsRes.data.map(d => ({ ...d, type: 'doctor' })));
            }
        } catch (err: any) {
            console.error("Failed to fetch doctor emails by roles:", err.message);
        }

        // Fetch staff emails by roles
        try {
            const staffRes = await axios.post(
                `${process.env.STAFF_SERVICE_URL || process.env.STAFF_SERVICE}/staff/emails-by-roles`,
                { roleIds, hospitalId }
            );
            if (Array.isArray(staffRes.data)) {
                allRecipients.push(...staffRes.data.map(s => ({ ...s, type: 'staff' })));
            }
        } catch (err: any) {
            console.error("Failed to fetch staff emails by roles:", err.message);
        }

        // Deduplicate by email address
        const uniqueRecipients = Array.from(
            new Map(allRecipients.filter(u => u && u.email).map(u => [u.email, u])).values()
        );

        return res.status(200).json({
            success: true,
            data: uniqueRecipients
        });
    } catch (error: any) {
        console.error("Error in getRecipientsByRoles:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch recipients by roles",
            error: error.message
        });
    }
});
