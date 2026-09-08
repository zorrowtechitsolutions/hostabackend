import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Rolepermission from "../models/rolepermission.model";
import { publishEvent } from "../events/publisher";
import axios from "axios";

// REGISTER - POST /Rolepermission


export const createRolepermission = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { roleId, permissionIds, pharmacyId, hospitalId, labId } = req.body;

      if (!roleId || !Array.isArray(permissionIds)) {
        res.status(400).json({
          success: false,
          message: "roleId and permissionIds array required",
        });
        return;
      }

      // 1️⃣ Get existing permissions
      const existing = await Rolepermission.findAll({
        where: { roleId },
      });

      const existingIds = existing.map((p: any) => p.permissionId);

      // 2️⃣ Find what to delete
      const toDelete = existingIds.filter(
        (id: number) => !permissionIds.includes(id)
      );

      // 3️⃣ Find what to add
      const toAdd = permissionIds.filter(
        (id: number) => !existingIds.includes(id)
      );

      // 4️⃣ DELETE removed permissions
      if (toDelete.length > 0) {
        await Rolepermission.destroy({
          where: {
            roleId,
            permissionId: toDelete,
          },
        });
      }

      // 5️⃣ INSERT new permissions only
      const newRecords = toAdd.map((pid: number) => ({
        roleId,
        permissionId: pid,
        pharmacyId: pharmacyId || null,
        hospitalId: hospitalId || null,
        labId: labId || null,
      }));

      if (newRecords.length > 0) {
        await Rolepermission.bulkCreate(newRecords);
      }

      res.status(200).json({
        success: true,
        message: "Role permissions synced successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }
);


// GET ONE - GET /Rolepermission/:id
export const getanRolepermission: any = asyncHandler(async (req: Request, res: Response) => {
  const rolepermission = await Rolepermission.findByPk(req.params.id);
  if (!rolepermission) {
    res.status(404).json({
      success: false,
      message: "Rolepermission not found",
      data: null,
      error: { code: "ROLEPERMISSION_NOT_FOUND", details: null },
    });
    return;
  }

  res.status(200).json({
    success: true,
    status: "Success",
    data: rolepermission,
    error: null,
  });
});

// UPDATE - PUT /Rolepermission/:id
export const updateData: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updatePayload = req.body;

  const rolepermission = await Rolepermission.update(updatePayload, {
    where: { id: id },
    returning: true,
  });


  if (!rolepermission[1] || rolepermission[1].length === 0) {
    res.status(404).json({
      success: false,
      message: "Rolepermission not found",
      status: 200,
      data: null,
      error: { code: "ROLEPERMISSION_NOT_FOUND", details: null },
    });
    return;
  }

// export const updateData: any = asyncHandler(async (req: Request, res: Response) => {
//   const { id } = req.params;
//   const updatePayload = req.body;

//   const rolepermission = await Rolepermission.update(updatePayload, {
//     where: { id: id },
//     returning: true,
//   });

//   // rolepermission[0] => affected rows count
//   // rolepermission[1] => updated rows array

//   if (!rolepermission[1] || rolepermission[1].length === 0) {
//     res.status(404).json({
//       success: false,
//       message: "Rolepermission not found",
//       data: null,
//     });
//     return;
//   }

//   // ✅ FIXED
//   const updatedRolepermission = rolepermission[1][0];

//   await publishEvent("rolepermission_events", "ROLEPERMISSION_UPDATED", {
//     RolepermissionId: updatedRolepermission.id,
//   });

//   res.status(200).json({
//     success: true,
//     message: "Successfully updated",
//     data: updatedRolepermission,
//   });
// });

  // ✅ Get updated booking object
  const updatedRolepermission = Rolepermission[1][0];

  await publishEvent("rolepermission_events", "ROLEPERMISSION_UPDATED", {
    RolepermissionId: updatedRolepermission.id,
  });



  res.status(200).json({
    success: true,
    message: "successfully updated",
    data: updatedRolepermission,
    error: null,
  });
});

// DELETE - DELETE /Rolepermission/:id
export const rolepermissionDelete: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const rolepermission = await Rolepermission.findByPk(id);
  if (!rolepermission) {
    res.status(404).json({
      success: false,
      message: "Rolepermission not found",
      data: null,
      error: { code: "ROLEPERMISSION_NOT_FOUND", details: null },
    });
    return;
  }


  await Rolepermission.destroy({
    where: { id: id }
  });


  res.status(200).json({
    success: true,
    message: "Your account deleted successfully",
    status: 200,
    data: null,
    error: null,
  });
});

// GET ALL - GET /Rolepermission
export const getRolepermission: any = asyncHandler(async (req: Request, res: Response) => {


   let { hospitalId, labId, pharmacyId, roleId }: any = req.query;
    

    if (Array.isArray(hospitalId)) hospitalId = hospitalId[0];
        if (Array.isArray(labId)) labId = labId[0];
    if (Array.isArray(pharmacyId)) pharmacyId = pharmacyId[0];
        if (Array.isArray(roleId)) roleId = roleId[0];



  const whereClause: any = {};


  if (hospitalId !== undefined) {
    whereClause.hospitalId = Number(hospitalId);
  }

  if (labId !== undefined) {
    whereClause.labId = Number(labId);
  }

  if (pharmacyId !== undefined) {
    whereClause.pharmacyId = Number(pharmacyId);
  }

    if (roleId !== undefined) {
    whereClause.roleId = Number(roleId);
  }

  const rolepermission = await Rolepermission.findAll({
    where: whereClause,
  });  

  

  if (rolepermission.length === 0) {
    res.status(404).json({
      success: false,
      message: "No data found",
      data: null,
      error: { code: "NO_DATA_FOUND", details: null },
    });
    return;
  }

  res.status(200).json({
    success: true,
    status: "Success",
    data: rolepermission,
    error: null,
  });
});




export const rolepermissionAssgin = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { hospitalId, roleId, userType }: any = req.body; // Prefer body instead of query

    if (!hospitalId || !roleId || !userType) {
      res.status(400).json({
        success: false,
        message: "hospitalId, roleId and userType are required",
      });
      return;
    }

    // Check role exists
    let role: any;

    try {
      role = await axios.get(
        `${process.env.ROLE_SERVICE_URL}/role?hospitalId=${hospitalId}&roleId=${roleId}`,
        {
          headers: { Authorization: req.headers.authorization },
        }
      );
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: "Role not found",
      });
      return;
    }

    // Check hospital exists
    let hospital: any;

    try {
      hospital = await axios.get(
        `${process.env.HOSPITAL_SERVICE_URL}/hospital/${hospitalId}`,
      );
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: "Hospital not found",
      });
      return;
    }

    // =========================
    // DOCTOR ROLE ASSIGNMENT
    // =========================

    if (userType.toLowerCase() === "doctor") {
      const doctors = req.body.doctorIds || [];

      for (const doctor of doctors) {
        try {
          const doctorResponse = await axios.get(
            `${process.env.DOCTOR_SERVICE_URL}/doctor?hospitalId=${hospitalId}&doctorId=${doctor.id}`,
          );

          const doctorData = doctorResponse?.data?.data;

          if (doctorData) {
         

             await axios.put(
    `${process.env.DOCTOR_SERVICE_URL}/doctor/${doctor.id}`,
    { roleId: doctor.roleId },
    {
      headers: req.headers.authorization
        ? { Authorization: req.headers.authorization }
        : {},
    }
  );
          }
        } catch (error) {
          console.error(`Failed to update doctor ${doctor.id}`, error);
        }
      }
    }

    // =========================
    // STAFF ROLE ASSIGNMENT
    // =========================

    if (userType.toLowerCase() === "staff") {
      const staffs = req.body.staffIds || [];

      for (const staff of staffs) {
        try {
          const staffResponse = await axios.get(
            `${process.env.STAFF_SERVICE_URL}/staff?hospitalId=${hospitalId}&staffId=${staff.id}`,
          );

          const staffData = staffResponse?.data?.data;

          if (staffData) {
            await axios.put(
    `${process.env.STAFF_SERVICE_URL}/staff/${staff.id}`,
    { roleId: staff.roleId },
    {
      headers: req.headers.authorization
        ? { Authorization: req.headers.authorization }
        : {},
    }
  );
          }
        } catch (error) {
          console.error(`Failed to update staff ${staff.id}`, error);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Role assignment updated successfully",
    });
  },
);