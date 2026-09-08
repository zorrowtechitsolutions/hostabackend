import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Role from "../models/role.model";
import { publishEvent } from "../events/publisher";
import axios from "axios";
import dotenv from "dotenv";
import { Op } from "sequelize";
dotenv.config();

// REGISTER - POST /role

export const createRole: any = asyncHandler(async (req: Request, res: Response) => {
  
  const { name, description,  hospitalId, labId, pharmacyId  } = req.body;  


   

let isExisting = null;

if (hospitalId) {
  isExisting = await Role.findOne({
    where: {
      name,
      hospitalId
    }
  });
}

if (labId && !isExisting) {
  isExisting = await Role.findOne({
    where: {
      name,
      labId
    }
  });
}

if (pharmacyId && !isExisting) {
  isExisting = await Role.findOne({
    where: {
      name,
      pharmacyId
    }
  });
}

if (isExisting) {
  res.status(400).json({
    success: false,
    message: "Role already exists for this scope",
    data: null,
             error: { code: "ROLE_EXIST", details: null },
  });
  return;
}


  if(hospitalId){

     try {
     
        const hospital = await axios.get(`${process.env.HOSPITAL_SERVICE_URL}/hospital/${hospitalId}`, {
         headers: { Authorization: req.headers.authorization }

       })


       if(!hospital || !hospital.data) {
           res.status(404).json({
             success: false,
             message: "Hospital not found",
             data: null,
             error: { code: "HOSPITAL_NOT_FOUND", details: null },
           });
           return;
       }
     } catch (error: any) {
         res.status(error.response?.status || 500).json({
           success: false,
           message: "Failed to validate hospital",
           data: null,
           error: { code: "HOSPITAL_VALIDATION_ERROR", details: error.message },
         });
         return;
     }
  }


    if(labId){
     try {
       const lab = await axios.get(`${process.env.LAB_SERVICE_API}/lab/${labId}`, {
         headers: { Authorization: req.headers.authorization }
       })
       if(!lab || !lab.data) {
           res.status(404).json({
             success: false,
             message: "Lab not found",
             data: null,
             error: { code: "LAB_NOT_FOUND", details: null },
           });
           return;
       }
     } catch (error: any) {
         res.status(error.response?.status || 500).json({
           success: false,
           message: "Failed to validate lab",
           data: null,
           error: { code: "LAB_VALIDATION_ERROR", details: error.message },
         });
         return;
     }
  }
 


    if(pharmacyId){
     try {
       const pharmacy = await axios.get(`${process.env.PHARMACY_SERVICE_API}/lab/${labId}`, {
         headers: { Authorization: req.headers.authorization }
       })
       if(!pharmacy || !pharmacy.data) {
           res.status(404).json({
             success: false,
             message: "Pharmacy not found",
             data: null,
             error: { code: "PHARMACY_NOT_FOUND", details: null },
           });
           return;
       }
     } catch (error: any) {
         res.status(error.response?.status || 500).json({
           success: false,
           message: "Failed to validate lab",
           data: null,
           error: { code: "PHARMACY_VALIDATION_ERROR", details: error.message },
         });
         return;
     }
  }

  const newRole = await Role.create({
    name, description,  hospitalId, labId, pharmacyId 
  });



  await publishEvent("role_events", "ROLE_REGISTERED", {
    roleId: newRole.id,
  });



  res.status(201).json({
    success: true,
    message: "Registeration completed successfully",
    data: null,
    error: null,
  });
});



// GET ONE - GET /role/:id
export const getanRole : any = asyncHandler(async (req: Request, res: Response) => {
  const role = await Role.findByPk(req.params.id);
  if (!role) {
    res.status(404).json({
      success: false,
      message: "Role not found",
      data: null,
      error: { code: "ROLE_NOT_FOUND", details: null },
    });
    return;
  }

  res.status(200).json({
    success: true,
    status: "Success",
    data: role,
    error: null,
  });
});

// UPDATE - PUT /role/:id
export const updateData: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updatePayload = req.body;

  const role = await Role.update(updatePayload, {
    where: { id: id },
    returning: true,
  });


  if (!role[1] || role[1].length === 0) {
    res.status(404).json({
      success: false,
      message: "Role not found",
      status: 200,
      data: null,
      error: { code: "ROLE_NOT_FOUND", details: null },
    });
    return;
  }

  // ✅ Get updated booking object
  const updatedRole = role[1][0];

  await publishEvent("role_events", "ROLE_UPDATED", {
    roleId: updatedRole.id,
  });



  res.status(200).json({
    success: true,
    message: "successfully updated",
    data: updatedRole,
    error: null,
  });
});

// DELETE - DELETE /role/:id
export const roleDelete: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const role = await Role.findByPk(id);
  if (!role) {
    res.status(404).json({
      success: false,
      message: "Role not found",
      data: null,
      error: { code: "ROLE_NOT_FOUND", details: null },
    });
    return;
  }


  await Role.destroy({
    where: { id: id }
  });

    await publishEvent("role_events", "ROLE_DELETED", {
    roleId: role.id,
  });

  res.status(200).json({
    success: true,
    message: "Your account deleted successfully",
    status: 200,
    data: null,
    error: null,
  });
});




export const getRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
 let {
    hospitalId,
    labId,
    pharmacyId,
    roleId,
    page = 1,
    limit = 10,
    search_query,
  }: any = req.query;

  

  if (Array.isArray(hospitalId)) hospitalId = hospitalId[0];
  if (Array.isArray(labId)) labId = labId[0];
  if (Array.isArray(pharmacyId)) pharmacyId = pharmacyId[0];
  if (Array.isArray(roleId)) roleId = roleId[0];
  if (Array.isArray(page)) page = page[0];
  if (Array.isArray(limit)) limit = limit[0];
  if (Array.isArray(search_query)) search_query = search_query[0];

  const pageNum = Number(page);
  const limitNum = Number(limit);

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
    whereClause.id = Number(roleId);
  }


  if (search_query) {
    whereClause[Op.or] = [
      {
        name: {
          [Op.iLike]: `%${search_query}%`,
        },
      },
    ];
  }

  const role = await Role.findAndCountAll({
    where: whereClause,
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
    order: [["createdAt", "DESC"]],
  });

  const admin = await Role.findAll({
    limit: 5,
    order: [["createdAt", "ASC"]],
  });


  if (role.count === 0) {
     res.status(404).json({
      success: false,
      message: "No data found",
      data: [],
      admin,
      error: { code: "NO_DATA_FOUND", details: null },
    });
    return;
  }

  const totalPages = Math.ceil(role.count / limitNum);

  res.status(200).json({
    success: true,
    data: role.rows,
    admin,
    pagination: {
      totalItems: role.count,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPreviousPage: pageNum > 1,
    },
    error: null,
  });
  return;
});