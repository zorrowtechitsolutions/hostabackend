import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import axios from 'axios';
import AuditLog from '../models/auditLog.model';
import { Op } from 'sequelize';
import { AUDIT_INCLUDED_ROLES, AUDIT_EXCLUDED_ROLES } from '../constants/audit.constants';

// ── Helper: single string from query param ──
const getQueryString = (queryParam: any): string | undefined => {
    if (Array.isArray(queryParam)) return queryParam[0] as string;
    return queryParam as string | undefined;
};

// ── Helper: fetch role names assigned to a hospital from the role-service ──
const fetchAssignedRoles = async (hospitalId: number | string): Promise<string[]> => {
    try {
        const response = await axios.get(
            `${process.env.ROLE_SERVICE_URL}/role`,
            {
                params: { hospitalId, limit: 200 },
                headers: { 'x-service-secret': process.env.INTERNAL_SERVICE_SECRET },
                timeout: 5000,
            }
        );
        const roles: any[] = response.data?.data || [];
        const customRoles = roles
            .map((r: any) => (r.name || '').toUpperCase())
            .filter((name: string) => name && !AUDIT_EXCLUDED_ROLES.includes(name));

        // Combine custom roles created by hospital with default auditable roles
        return Array.from(new Set([...customRoles, ...AUDIT_INCLUDED_ROLES]));
    } catch (err: any) {
        console.error('[AUDIT] Failed to fetch hospital roles from role-service:', err.message);
        return [...AUDIT_INCLUDED_ROLES];
    }
};

// @route   GET /auth/audit-logs/:hospitalId   (hospitalId ignored for superadmin)
// @desc    Get audit logs
//          • superadmin → all hospitals, all logs
//          • hospital   → own hospital only, only roles assigned by that hospital
// @access  Private
export const getAuditLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // ── Resolve caller from gateway header or req.user (fallback) ──
    const rawUserData = req.headers['x-user-data'];
    const userData = rawUserData
        ? JSON.parse(rawUserData as string)
        : (req as any).user || null;

    const rawRole = (userData?.role || userData?.userType || '').toLowerCase();

    const isSuperAdmin = ['superadmin', 'super_admin'].includes(rawRole);
    const isHospitalAdmin = ['hospital', 'admin', 'hospital_admin', 'hospitaladmin'].includes(rawRole);

    console.log('[AUDIT] rawUserData:', rawUserData);
    console.log('[AUDIT] decoded userData:', userData);
    console.log('[AUDIT] rawRole:', rawRole, '| isSuperAdmin:', isSuperAdmin, '| isHospitalAdmin:', isHospitalAdmin);
    console.log('[AUDIT] req.params:', req.params);

    // ── Shared query params ──
    const pageStr    = getQueryString(req.query.page)    || '1';
    const limitStr   = getQueryString(req.query.limit)   || '10';
    const roleFilter = getQueryString(req.query.role);
    let   status     = getQueryString(req.query.status);
    let   riskLevel  = getQueryString(req.query.riskLevel);
    const search     = getQueryString(req.query.search);
    const department = getQueryString(req.query.department);
    const startDate  = getQueryString(req.query.startDate);
    const endDate    = getQueryString(req.query.endDate);

    const whereClause: any = {};

    // ════════════════════════════════════════════════════
    //  SUPERADMIN
    //  • Default: show all hospital admin login logs
    //  • With ?hospitalId=X: show assigned role logs for that hospital
    // ════════════════════════════════════════════════════
    if (isSuperAdmin) {
        const filterHospitalId = getQueryString(req.query.hospitalId);

        if (filterHospitalId) {
            // Drill into a specific hospital → show assigned role logs (not hospital admin logs)
            const hid = String(filterHospitalId);
            let assignedRoles = await fetchAssignedRoles(hid);
            assignedRoles = assignedRoles.filter(role => !['HOSPITAL', 'HOSPITAL_ADMIN', 'ADMIN'].includes(role));

            whereClause.hospitalId = parseInt(hid);
            whereClause.role = { [Op.in]: assignedRoles };
        } else {
            // Default view → only hospital admin login logs across all hospitals
            whereClause.role = { [Op.in]: ['HOSPITAL', 'HOSPITAL_ADMIN', 'ADMIN'] };
        }

    // ════════════════════════════════════════════════════
    //  HOSPITAL ADMIN — own hospital only, roles assigned to/by hospital
    // ════════════════════════════════════════════════════
    } else if (isHospitalAdmin) {
        const paramHospitalId = req.params.hospitalId;
        const effectiveHospitalId = (paramHospitalId && paramHospitalId !== '0')
            ? paramHospitalId
            : (userData?.hospitalId || userData?.id);

        if (!effectiveHospitalId) {
            res.status(400).json({ success: false, message: 'hospitalId parameter or token hospitalId is required.' });
            return;
        }

        // Fetch roles assigned by this hospital from role-service + standard hospital roles
        const hid = String(effectiveHospitalId);
        let assignedRoles = await fetchAssignedRoles(hid);

        // Exclude hospital admin roles from the hospital's view
        assignedRoles = assignedRoles.filter(role => !['HOSPITAL', 'HOSPITAL_ADMIN', 'ADMIN'].includes(role));

        console.log('[AUDIT] hospital hid:', hid, '| assignedRoles (filtered):', assignedRoles);

        whereClause.hospitalId = parseInt(hid);
        whereClause.role = { [Op.in]: assignedRoles };

        console.log('[AUDIT] final whereClause:', JSON.stringify(whereClause));

    } else {
        console.log('[AUDIT] Access denied for rawRole:', rawRole);
        res.status(403).json({ success: false, message: `Access denied for role: ${userData?.role || 'unknown'}` });
        return;
    }

    // ── Optional shared filters ──
    if (roleFilter) {
        const normalizedRole = roleFilter.toUpperCase();
        // Only allow narrowing — never allow escalating to excluded roles
        if (AUDIT_INCLUDED_ROLES.includes(normalizedRole) && !AUDIT_EXCLUDED_ROLES.includes(normalizedRole)) {
            whereClause.role = normalizedRole;
        }
    }

    if (status) {
        status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
        whereClause.status = status;
    }

    if (riskLevel) {
        riskLevel = riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1).toLowerCase();
        whereClause.riskLevel = riskLevel;
    }

    if (department) {
        whereClause.department = { [Op.iLike]: department };
    }

    if (search) {
        whereClause.name = { [Op.iLike]: `%${search}%` };
    }

    if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
        if (endDate)   whereClause.createdAt[Op.lte] = new Date(endDate);
    }

    const page   = parseInt(pageStr);
    const limit  = parseInt(limitStr);
    const offset = (page - 1) * limit;

    const { count, rows } = await AuditLog.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
        success: true,
        count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        data: rows,
    });
});
