import { Request, Response } from "express";
import * as TemplateService from "../services/template.service";

export const createTemplate = async (req: any, res: Response) => {
    try {
        const template = await TemplateService.createTemplate({
            hospitalId: req.user.hospitalId,
            createdBy: req.user.id,
            ...req.body
        });

        return res.status(201).json({
            success: true,
            message: "Template created successfully",
            data: template
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ── Helper to ensure single string from query param ──
const getQueryString = (queryParam: any): string | undefined => {
    if (Array.isArray(queryParam)) {
        return queryParam[0] as string;
    }
    return queryParam as string | undefined;
};

export const getTemplates = async (req: any, res: Response) => {
    try {
        const page = parseInt(getQueryString(req.query.page) || "1", 10);
        const limit = parseInt(getQueryString(req.query.limit) || "20", 10);
        const offset = (page - 1) * limit;

        const category = getQueryString(req.query.category);
        let status = getQueryString(req.query.status);
        if (status) {
            status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
        }
        const search = getQueryString(req.query.search);

        const { count, rows } = await TemplateService.getTemplates({
            hospitalId: req.user.hospitalId,
            category,
            status,
            search,
            limit,
            offset,
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
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getTemplateById = async (req: any, res: Response) => {
    try {
        const templateId = Number(req.params.id);
        const template = await TemplateService.getTemplateById(templateId, req.user.hospitalId);

        if (!template) {
            return res.status(404).json({ success: false, message: "Template not found" });
        }

        return res.status(200).json({
            success: true,
            data: template,
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const updateTemplate = async (req: any, res: Response) => {
    try {
        const templateId = Number(req.params.id);
        
        const updated = await TemplateService.updateTemplate(
            templateId,
            req.user.hospitalId,
            req.body
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: "Template not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Template updated successfully",
            data: updated,
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteTemplate = async (req: any, res: Response) => {
    try {
        const templateId = Number(req.params.id);
        
        const deleted = await TemplateService.deleteTemplate(templateId, req.user.hospitalId);

        if (!deleted) {
            return res.status(404).json({ success: false, message: "Template not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Template deleted successfully",
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};



