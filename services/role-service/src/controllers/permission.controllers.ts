import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Permission from "../models/permission.model";
import { publishEvent } from "../events/publisher";
import axios from "axios";
import RolePermission from "../models/rolepermission.model";
import Role from "../models/role.model";
import { Op } from "sequelize";


// REGISTER - POST /Permission

export const createPermission: any =
  asyncHandler(async (req: Request, res: Response): Promise<void> => {

    const permissions = req.body.permissions;

    if (!permissions || !Array.isArray(permissions)) {
       res.status(400).json({
        success: false,
        message: "permissions must be an array"
      });
    }

    // ✅ Correct method
    const newPermissions =
      await Permission.bulkCreate(permissions);

    // Publish event (optional)
    await publishEvent(
      "permission_events",
      "PERMISSION_REGISTERED",
      {
        permissionIds:
          newPermissions.map(p => p.id)
      }
    );

    res.status(201).json({
      success: true,
      message: "Permissions created successfully",
      data: newPermissions,
      error: null,
    });

  });



// GET ONE - GET /Permission/:id
export const getanPermission : any = asyncHandler(async (req: Request, res: Response) => {
  const permission = await Permission.findByPk(req.params.id);
  if (!permission) {
    res.status(404).json({
      success: false,
      message: "Permission not found",
      data: null,
      error: { code: "PERMISSION_NOT_FOUND", details: null },
    });
    return;
  }

  res.status(200).json({
    success: true,
    status: "Success",
    data: permission,
    error: null,
  });
});

// UPDATE - PUT /Permission/:id
export const updateData: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updatePayload = req.body;

  const permission = await Permission.update(updatePayload, {
    where: { id: id },
    returning: true,
  });


  if (!permission[1] || permission[1].length === 0) {
    res.status(404).json({
      success: false,
      message: "Permission not found",
      status: 200,
      data: null,
      error: { code: "PERMISSION_NOT_FOUND", details: null },
    });
    return;
  }

  // ✅ Get updated booking object
  const updatedPermission = permission[1][0];

  await publishEvent("permission_events", "PERMISSION_UPDATED", {
    PermissionId: updatedPermission.id,
  });



  res.status(200).json({
    success: true,
    message: "successfully updated",
    data: updatedPermission,
    error: null,
  });
});

// DELETE - DELETE /Permission/:id
export const permissionDelete: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const permission = await Permission.findByPk(id);
  if (!permission) {
    res.status(404).json({
      success: false,
      message: "Permission not found",
      data: null,
      error: { code: "PERMISSION_NOT_FOUND", details: null },
    });
    return;
  }


  await Permission.destroy({
    where: { id: id }
  });

  await publishEvent("permission_events", "PERMISSION_DELETED", {
    PermissionId: permission.id,
  });


  res.status(200).json({
    success: true,
    message: "Your account deleted successfully",
    status: 200,
    data: null,
    error: null,
  });
});

// GET ALL - GET /Permission

export const getPermission = asyncHandler(
  async (req: Request, res: Response) : Promise<void> => {
    let {
      page = 1,
      limit = 10,
      search_query,
    }: any = req.query;

    // Handle array query params
    if (Array.isArray(page)) page = page[0];
    if (Array.isArray(limit)) limit = limit[0];
    if (Array.isArray(search_query)) search_query = search_query[0];

    // Validate pagination
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 10, 1);

    const whereClause: any = {};

    // Search
    if (search_query && search_query.trim() !== "") {
      whereClause[Op.or] = [
        {
          module: {
            [Op.iLike]: `%${search_query.trim()}%`,
          },
        },
        {
          action: {
            [Op.iLike]: `%${search_query.trim()}%`,
          },
        },
      ];
    }

    const permission = await Permission.findAndCountAll({
      where: whereClause,
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,

      // Change this if your table has another sortable column
      order: [["id", "ASC"]],
    });

    if (permission.count === 0) {
       res.status(404).json({
        success: false,
        message: "No data found",
        data: [],
        pagination: {
          totalItems: 0,
          totalPages: 0,
          currentPage: pageNum,
          limit: limitNum,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        error: null,
      });
      return;
    }

    const totalPages = Math.ceil(permission.count / limitNum);

     res.status(200).json({
      success: true,
      message: "Permissions fetched successfully",
      data: permission.rows,
      pagination: {
        totalItems: permission.count,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
      error: null,
    });
    return;
  }
);





export const checkPermissionService = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {

    const { roleId, module, action } = req.body;

    if (!roleId) {
      res.status(200).json({ allowed: false });
      return;
    }

    // Step 1: Find the permission row matching module + action
    const permission = await Permission.findOne({
      where: { module, action },
    });

    if (!permission) {
      // This module+action permission doesn't exist at all in the DB
      res.status(200).json({ allowed: false });
      return;
    }

    // Step 2: Check the junction table — does this role have that permission?
    const rolePermission = await RolePermission.findOne({
      where: {
        roleId: Number(roleId),
        permissionId: permission.id,
      },
    });

    res.status(200).json({
      allowed: !!rolePermission,
    });
  }
);