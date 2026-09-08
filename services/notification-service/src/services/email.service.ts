import EmailNotification from "../models/email.model";
import EmailTemplate from "../models/template.model";
import { publishEvent } from "../events/publisher";
import { Op } from "sequelize";

// ── Save as Draft (no sending) ──
export const saveDraft = async (payload: any) => {
    let {
        hospitalId,
        createdBy,
        recipients,
        subject,
        message,
        templateId
    } = payload;

    if (templateId && (!subject || !message)) {
        const template = await EmailTemplate.findOne({ where: { id: templateId, hospitalId } });
        if (template) {
            subject = subject || template.get("subject") as string;
            message = message || template.get("message") as string;
        }
    }

    const draft = await EmailNotification.create({
        hospitalId,
        createdBy,
        subject,
        message,
        roles: { recipients },
        totalRecipients: recipients?.length || 0,
        status: "DRAFT",
        templateId
    });

    return draft;
};

// ── Send Email (creates record + publishes to RabbitMQ) ──
export const sendEmailNotification = async (payload: any) => {
    let {
        hospitalId,
        createdBy,
        recipients,
        subject,
        message,
        templateId
    } = payload;

    if (templateId && (!subject || !message)) {
        const template = await EmailTemplate.findOne({ where: { id: templateId, hospitalId } });
        if (!template) {
            throw new Error(`Email template with ID ${templateId} not found for hospital ${hospitalId}`);
        }
        subject = subject || template.get("subject") as string;
        message = message || template.get("message") as string;
    }

    if (!subject || !message) {
        throw new Error("Subject and Message are required");
    }

    const notification = await EmailNotification.create({
        hospitalId,
        createdBy,
        subject,
        message,
        roles: { recipients },
        totalRecipients: recipients?.length || 0,
        status: "QUEUED",
        sentAt: new Date(),
        templateId
    });

    await publishEvent(
        "email_events",
        "EMAIL_SEND",
        {
            notificationId: (notification as any).id,
            hospitalId,
            recipients,
            subject,
            message
        }
    );

    return notification;
};

// ── Send a Draft (changes status from DRAFT → QUEUED and publishes) ──
export const sendDraft = async (id: number, hospitalId: number) => {
    const draft = await EmailNotification.findByPk(id);
    if (!draft) return null;

    const status = draft.get("status") as string;
    if (status !== "DRAFT") return null;

    const roles = draft.get("roles") as any || {};
    const recipients = roles.recipients || [];

    await EmailNotification.update(
        { status: "QUEUED", sentAt: new Date() },
        { where: { id } }
    );

    await publishEvent(
        "email_events",
        "EMAIL_SEND",
        {
            notificationId: id,
            hospitalId,
            recipients,
            subject: draft.get("subject"),
            message: draft.get("message")
        }
    );

    return EmailNotification.findByPk(id);
};

// ── List ──
export const getEmailNotifications = async (params: {
    limit: number;
    offset: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    hospitalId?: number;
}) => {
    const where: any = {};

    if (params.hospitalId) {
        where.hospitalId = params.hospitalId;
    }

    if (params.search) {
        where.subject = { [Op.iLike]: `%${params.search}%` };
    }

    if (params.status) {
        where.status = params.status;
    }

    if (params.startDate || params.endDate) {
        where.createdAt = {};
        if (params.startDate) {
            where.createdAt[Op.gte] = new Date(params.startDate);
        }
        if (params.endDate) {
            where.createdAt[Op.lte] = new Date(params.endDate);
        }
    }

    return EmailNotification.findAndCountAll({
        where,
        limit: params.limit,
        offset: params.offset,
        order: [["createdAt", "DESC"]],
    });
};

// ── Get by ID ──
export const getEmailNotificationById = async (id: number) => {
    return EmailNotification.findByPk(id);
};

// ── Update (only DRAFT emails can be edited) ──
export const updateEmailNotification = async (
    id: number,
    updates: any
) => {
    const notification = await EmailNotification.findByPk(id);
    if (!notification) return null;

    const status = notification.get("status") as string;
    if (status !== "DRAFT") return null;

    const updatePayload: any = {};

    if (updates.subject !== undefined) {
        updatePayload.subject = updates.subject;
    }

    if (updates.message !== undefined) {
        updatePayload.message = updates.message;
    }

    if (updates.templateId !== undefined) {
        updatePayload.templateId = updates.templateId;
    }

    if (updates.recipients !== undefined) {
        const recipients = updates.recipients ?? [];
        updatePayload.roles = { recipients };
        updatePayload.totalRecipients = recipients.length;
    }

    await EmailNotification.update(updatePayload, { where: { id } });

    return EmailNotification.findByPk(id);
};

// ── Delete (only DRAFT emails can be deleted) ──
export const deleteEmailNotification = async (id: number) => {
    const notification = await EmailNotification.findByPk(id);
    if (!notification) return false;

    const status = notification.get("status") as string;
    if (status !== "DRAFT") return false;

    const deletedCount = await EmailNotification.destroy({ where: { id } });
    return deletedCount > 0;
};

// ── Duplicate (creates a copy as DRAFT) ──
export const duplicateEmail = async (id: number) => {
    const original = await EmailNotification.findByPk(id);
    if (!original) return null;

    const duplicate = await EmailNotification.create({
        hospitalId: original.get("hospitalId"),
        createdBy: original.get("createdBy"),
        subject: original.get("subject"),
        message: original.get("message"),
        roles: original.get("roles"),
        totalRecipients: original.get("totalRecipients"),
        status: "DRAFT"
    });

    return duplicate;
};

// ── Resend (creates a new QUEUED copy from a SENT email and publishes) ──
export const resendEmail = async (id: number, hospitalId: number) => {
    const original = await EmailNotification.findByPk(id);
    if (!original) return null;

    const roles = original.get("roles") as any || {};
    const recipients = roles.recipients || [];

    const resent = await EmailNotification.create({
        hospitalId: original.get("hospitalId"),
        createdBy: original.get("createdBy"),
        subject: original.get("subject"),
        message: original.get("message"),
        roles: original.get("roles"),
        totalRecipients: original.get("totalRecipients"),
        status: "QUEUED",
        sentAt: new Date()
    });

    await publishEvent(
        "email_events",
        "EMAIL_SEND",
        {
            notificationId: (resent as any).id,
            hospitalId,
            recipients,
            subject: original.get("subject"),
            message: original.get("message")
        }
    );

    return resent;
};

// ── Archive ──
export const archiveEmail = async (id: number) => {
    const notification = await EmailNotification.findByPk(id);
    if (!notification) return null;

    await EmailNotification.update(
        { status: "ARCHIVED", archivedAt: new Date() },
        { where: { id } }
    );

    return EmailNotification.findByPk(id);
};

// ── Unarchive ──
export const unarchiveEmail = async (id: number) => {
    const notification = await EmailNotification.findByPk(id);
    if (!notification) return null;

    await EmailNotification.update(
        { status: "DRAFT", archivedAt: null },
        { where: { id } }
    );

    return EmailNotification.findByPk(id);
};