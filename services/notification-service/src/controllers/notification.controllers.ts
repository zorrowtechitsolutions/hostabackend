import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Op } from "sequelize";

import Notification from "../models/notification.model";
import { publishEvent } from "../events/publisher";

const authorizeSelfAccess = (
  req: any,
  role: string,
  requestedId: string,
  res: Response
) => {
  const tokenId = Number(req.user?.id);
  const tokenRole = req.user?.role;
  const numericRequestedId = Number(requestedId);

  if (!req.user || Number.isNaN(tokenId) || Number.isNaN(numericRequestedId)) {
    res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
    return false;
  }

  if (tokenRole !== role && tokenRole !== "superadmin") {
    res.status(403).json({
      success: false,
      message: "Forbidden: role mismatch",
    });
    return false;
  }

  if (tokenRole !== "superadmin" && tokenId !== numericRequestedId) {
    res.status(403).json({
      success: false,
      message: "Forbidden: you can only access your own notifications",
    });
    return false;
  }

  return true;
};

/* =========================================================
   CREATE NOTIFICATION
   POST /notification
========================================================= */

export const createNotification: any = asyncHandler(
  async (req: Request, res: Response) => {

    const {
      userIds,
      hospitalIds,
      doctorIds,
      staffIds,
      pharmacyIds,
      labIds,
      superAdminIds,
      message,
    } = req.body;

    const newNotification = await Notification.create({

      userIds: userIds || [],
      hospitalIds: hospitalIds || [],
      doctorIds: doctorIds || [],
      staffIds: staffIds || [],
      pharmacyIds: pharmacyIds || [],
      labIds: labIds || [],
      superAdminIds: superAdminIds || [],

      message,

      /* READ STATUS */

      userReadStatus: {},
      hospitalReadStatus: {},
      doctorReadStatus: {},
      staffReadStatus: {},
      pharmacyReadStatus: {},
      labReadStatus: {},
      superAdminReadStatus: {},
    });

    await publishEvent(
      "notification_events",
      "NOTIFICATION_CREATED",
      {
        notificationId: newNotification.id,
      }
    );

    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      data: newNotification,
      error: null,
    });

  }
);

/* =========================================================
   GET ONE NOTIFICATION
   GET /notification/:id
========================================================= */

export const getanNotification: any = asyncHandler(
  async (req: Request, res: Response) => {

    const notification =
      await Notification.findByPk(req.params.id);

    if (!notification) {

      res.status(404).json({
        success: false,
        message: "Notification not found",
      });

      return;
    }

    res.status(200).json({
      success: true,
      data: notification,
      error: null,
    });

  }
);

/* =========================================================
   GET ALL NOTIFICATIONS
   GET /notification
========================================================= */

export const getNotification: any = asyncHandler(
  async (req: Request, res: Response) => {

    const page =
      parseInt(req.query.page as string) || 1;

    const limit =
      parseInt(req.query.limit as string) || 20;

    const offset = (page - 1) * limit;

    const {
      count,
      rows,
    } = await Notification.findAndCountAll({

      limit,
      offset,

      order: [["createdAt", "DESC"]],

    });

    res.status(200).json({
      success: true,
      data: rows,

      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit),
        limit,
      },

      error: null,
    });

  }
);

/* =========================================================
   GET USER/HOSPITAL/DOCTOR NOTIFICATIONS
   GET /notification/:role/:id
========================================================= */

export const getRoleNotifications: any = asyncHandler(
  async (req: any, res: Response) => {

    const { role, id } = req.params;

    // if (!authorizeSelfAccess(req, role, id, res)) {
    //   return;
    // }

    const numericId = Number(id);

    let whereCondition: any = {};

    switch (role) {

      case "user":

        whereCondition = {
          userIds: {
            [Op.contains]: [numericId],
          },
        };

        break;

      case "hospital":

        whereCondition = {
          hospitalIds: {
            [Op.contains]: [numericId],
          },
        };

        break;

      case "doctor":

        whereCondition = {
          doctorIds: {
            [Op.contains]: [numericId],
          },
        };

        break;

      case "staff":

        whereCondition = {
          staffIds: {
            [Op.contains]: [numericId],
          },
        };

        break;

      case "pharmacy":

        whereCondition = {
          pharmacyIds: {
            [Op.contains]: [numericId],
          },
        };

        break;

      case "lab":

        whereCondition = {
          labIds: {
            [Op.contains]: [numericId],
          },
        };

        break;

      case "superadmin":

        whereCondition = {
          superAdminIds: {
            [Op.contains]: [numericId],
          },
        };

        break;

      default:

        res.status(400).json({
          success: false,
          message: "Invalid role",
        });

        return;
    }

    const notifications =
      await Notification.findAll({

        where: whereCondition,

        order: [["createdAt", "DESC"]],

      });

    res.status(200).json({
      success: true,
      data: notifications,
      error: null,
    });

  }
);

export const getReadNotifications = asyncHandler(
  async (req: any, res: Response) => {
    const { role, id } = req.params;

//     if (!authorizeSelfAccess(req, role, id, res)) {
//     return;
// }

    const numericId = Number(id);

    const notifications = await Notification.findAll({
      order: [["createdAt", "DESC"]],
    });

    const readNotifications = notifications.filter((n: any) => {
      let targetIds: number[] = [];
      let readStatus: any = {};

      switch (role) {
        case "user":
          targetIds = n.userIds || [];
          readStatus = n.userReadStatus || {};
          break;

        case "hospital":
          targetIds = n.hospitalIds || [];
          readStatus = n.hospitalReadStatus || {};
          break;

        case "doctor":
          targetIds = n.doctorIds || [];
          readStatus = n.doctorReadStatus || {};
          break;

        case "staff":
          targetIds = n.staffIds || [];
          readStatus = n.staffReadStatus || {};
          break;

        case "pharmacy":
          targetIds = n.pharmacyIds || [];
          readStatus = n.pharmacyReadStatus || {};
          break;

        case "lab":
          targetIds = n.labIds || [];
          readStatus = n.labReadStatus || {};
          break;

        case "superadmin":
          targetIds = n.superAdminIds || [];
          readStatus = n.superAdminReadStatus || {};
          break;

        default:
          return false;
      }

      return (
        targetIds.includes(numericId) &&
        readStatus[String(numericId)] === true
      );
    });

    res.status(200).json({
      success: true,
      count: readNotifications.length,
      data: readNotifications,
    });
  }
);

export const getUnreadNotifications = asyncHandler(
  async (req: any, res: Response) => {
    const { role, id } = req.params;
//     if (!authorizeSelfAccess(req, role, id, res)) {
//     return;
// }

    const numericId = Number(id);

    const notifications = await Notification.findAll({
      order: [["createdAt", "DESC"]],
    });

    const unreadNotifications = notifications.filter((n: any) => {
      let targetIds: number[] = [];
      let readStatus: any = {};

      switch (role) {
        case "user":
          targetIds = n.userIds || [];
          readStatus = n.userReadStatus || {};
          break;

        case "hospital":
          targetIds = n.hospitalIds || [];
          readStatus = n.hospitalReadStatus || {};
          break;

        case "doctor":
          targetIds = n.doctorIds || [];
          readStatus = n.doctorReadStatus || {};
          break;

        case "staff":
          targetIds = n.staffIds || [];
          readStatus = n.staffReadStatus || {};
          break;

        case "pharmacy":
          targetIds = n.pharmacyIds || [];
          readStatus = n.pharmacyReadStatus || {};
          break;

        case "lab":
          targetIds = n.labIds || [];
          readStatus = n.labReadStatus || {};
          break;

        case "superadmin":
          targetIds = n.superAdminIds || [];
          readStatus = n.superAdminReadStatus || {};
          break;

        default:
          return false;
      }

      return (
        targetIds.includes(numericId) &&
        readStatus[String(numericId)] !== true
      );
    });

    res.status(200).json({
      success: true,
      count: unreadNotifications.length,
      data: unreadNotifications,
    });
  }
);



/* =========================================================
   MARK AS READ
   PUT /notification/read/:notificationId/:role/:userId
========================================================= */

export const markAsRead: any = asyncHandler(
  async (req: any, res: Response) => {

    const {
      notificationId,
      role,
      userId,
    } = req.params;

    // if (!authorizeSelfAccess(req, role, userId, res)) {
    //   return;
    // }

    const notification =
      await Notification.findByPk(notificationId);

    if (!notification) {

      res.status(404).json({
        success: false,
        message: "Notification not found",
      });

      return;
    }

    const numericUserId = Number(userId);

    switch (role) {

      case "user":

        notification.userReadStatus = {
          ...(notification.userReadStatus as object),
          [numericUserId]: true,
        };

        break;

      case "hospital":

        notification.hospitalReadStatus = {
          ...(notification.hospitalReadStatus as object),
          [numericUserId]: true,
        };

        break;

      case "doctor":

        notification.doctorReadStatus = {
          ...(notification.doctorReadStatus as object),
          [numericUserId]: true,
        };

        break;

      case "staff":

        notification.staffReadStatus = {
          ...(notification.staffReadStatus as object),
          [numericUserId]: true,
        };

        break;

      case "pharmacy":

        notification.pharmacyReadStatus = {
          ...(notification.pharmacyReadStatus as object),
          [numericUserId]: true,
        };

        break;

      case "lab":

        notification.labReadStatus = {
          ...(notification.labReadStatus as object),
          [numericUserId]: true,
        };

        break;

      case "superadmin":

        notification.superAdminReadStatus = {
          ...(notification.superAdminReadStatus as object),
          [numericUserId]: true,
        };

        break;

      default:

        res.status(400).json({
          success: false,
          message: "Invalid role",
        });

        return;
    }

    await notification.save();

    await publishEvent(
      "notification_events",
      "NOTIFICATION_READ",
      {
        notificationId: notification.id,
        role,
        userId,
      }
    );

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });

  }
);

/* =========================================================
   UPDATE NOTIFICATION
   PUT /notification/:id
========================================================= */

export const updateData: any = asyncHandler(
  async (req: Request, res: Response) => {

    const { id } = req.params;

    const updatePayload = req.body;

    const [
      affectedCount,
      updatedRows,
    ] = await Notification.update(
      updatePayload,
      {
        where: { id },
        returning: true,
      }
    );

    if (affectedCount === 0) {

      res.status(404).json({
        success: false,
        message: "Notification not found",
      });

      return;
    }

    res.status(200).json({
      success: true,
      message: "Notification updated successfully",
      data: updatedRows[0],
      error: null,
    });

  }
);

/* =========================================================
   DELETE NOTIFICATION
   DELETE /notification/:id
========================================================= */

export const notificationDelete: any = asyncHandler(
  async (req: Request, res: Response) => {

    const { id } = req.params;

    const deleted =
      await Notification.destroy({
        where: { id },
      });

    if (!deleted) {

      res.status(404).json({
        success: false,
        message: "Notification not found",
      });

      return;
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
      error: null,
    });

  }
);


export const markAsReadAll: any = asyncHandler(
  async (req: any, res: Response) : Promise<void> => {
    const { role, userId } = req.params;
    const { notificationIds } = req.body;


    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      res.status(400).json({
        success: false,
        message: "notificationIds array is required",
      });
      return;
    }

    const notifications = await Notification.findAll({
      where: {
        id: notificationIds,
      },
    });

    const numericUserId = Number(userId);

    for (const notification of notifications) {
      switch (role) {
        case "user":
          notification.userReadStatus = {
            ...(notification.userReadStatus as object),
            [numericUserId]: true,
          };
          break;

        case "hospital":
          notification.hospitalReadStatus = {
            ...(notification.hospitalReadStatus as object),
            [numericUserId]: true,
          };
          break;

        case "doctor":
          notification.doctorReadStatus = {
            ...(notification.doctorReadStatus as object),
            [numericUserId]: true,
          };
          break;

        case "staff":
          notification.staffReadStatus = {
            ...(notification.staffReadStatus as object),
            [numericUserId]: true,
          };
          break;

        case "pharmacy":
          notification.pharmacyReadStatus = {
            ...(notification.pharmacyReadStatus as object),
            [numericUserId]: true,
          };
          break;

        case "lab":
          notification.labReadStatus = {
            ...(notification.labReadStatus as object),
            [numericUserId]: true,
          };
          break;

        case "superadmin":
          notification.superAdminReadStatus = {
            ...(notification.superAdminReadStatus as object),
            [numericUserId]: true,
          };
          break;

        default:
           res.status(400).json({
            success: false,
            message: "Invalid role",
          });
          return;
      }

      await notification.save();

      await publishEvent(
        "notification_events",
        "NOTIFICATION_READ",
        {
          notificationId: notification.id,
          role,
          userId,
        }
      );
    }

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  }
);
