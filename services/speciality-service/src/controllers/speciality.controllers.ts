import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Speciality from "../models/speciality.model";
import { publishEvent } from "../events/publisher";
import dotenv from "dotenv";
import { Op } from "sequelize";
dotenv.config();

// REGISTER - POST /speciality/register
export const Registeration: any = asyncHandler(async (req: any, res: Response) => {
  const { name } = req.body;


  const exist = await Speciality.findOne({ where: { name: name } });
  if (exist) {
    res.status(404).json({
      success: false,
      message: "Speciality is already exist",
      data: null,
      error: { code: "SPECIALITY_ALREADY_EXISTS", details: null },
    });
    return;
  }

  const newSpeciality = await Speciality.create({
   name, 
  });

  await publishEvent("speciality_events", "SPECIALITY_REGISTERED", {
    specialityId: newSpeciality.id,
    name: newSpeciality.name,
  });

  res.status(201).json({
    success: true,
    message: "Registeration completed successfully",
    data: null,
    error: null,
  });
});


// GET ONE - GET /speciality/:id
export const getanSpeciality : any = asyncHandler(async (req: Request, res: Response) => {
  const speciality = await Speciality.findByPk(req.params.id);
  if (!speciality) {
    res.status(404).json({
      success: false,
      message: "Speciality not found",
      data: null,
      error: { code: "SPECIALITY_NOT_FOUND", details: null },
    });
    return;
  }

  res.status(200).json({
    success: true,
    status: "Success",
    data: speciality,
    error: null,
  });
});

// UPDATE - PUT /speciality/:id
export const updateData: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updatePayload = req.body;

  const speciality = await Speciality.update(updatePayload, {
    where: { id: id },
    returning: true,
  });

  if (!speciality[1] || speciality[1].length === 0) {
    res.status(404).json({
      success: false,
      message: "speciality not found",
      status: 200,
      data: null,
      error: { code: "SPECIALITY_NOT_FOUND", details: null },
    });
    return;
  }

  await publishEvent("speciality_events", "SPECIALITY_UPDATED", {
    specialityId: speciality[1][0].id,
  });

  res.status(200).json({
    success: true,
    message: "successfully updated",
    data: speciality[1][0],
    error: null,
  });
});

// DELETE - DELETE /speciality/:id
export const specialityDelete: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const speciality = await Speciality.findByPk(id);
  if (!speciality) {
    res.status(404).json({
      success: false,
      message: "speciality not found",
      data: null,
      error: { code: "SPECIALITY_NOT_FOUND", details: null },
    });
    return;
  }

  // 🔥 Perform Soft Delete (requires paranoid: true in model)
  await speciality.destroy();

    await publishEvent("speciality_events", "SPECIALITY_DELETED", {
    specialityId: speciality[1][0].id,
  });

  res.status(200).json({
    success: true,
    message: "Speciality soft-deleted successfully",
    status: 200,
    data: null,
    error: null,
  });
});

// GET ALL - GET /speciality
export const getSpecialitys = asyncHandler(async (req: Request, res: Response) : Promise<void> => {
  let { name, search_query,  page = 1, limit = 10 }: any = req.query;

   const normalize = (val: any) =>
      Array.isArray(val) ? val[0] : val;

 

   name = normalize(name);
   search_query = normalize(search_query);
    page = normalize(page);
    limit = normalize(limit);
 

  

      const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 10, 1);

  const whereCondition: any = {
    isDelete: false,
  };

  // Build OR search properly
  const search = search_query || name;

  if (search) {
    whereCondition[Op.or] = [
      {
        name: {
          [Op.iLike]: `%${search}%`,
        },
      },
    ];
  }

  const speciality = await Speciality.findAndCountAll({
    where: whereCondition,
    limit,
    offset: (pageNum - 1) * limitNum,
    order: [["createdAt", "ASC"]],
  });



  if (speciality.count === 0) {
  res.status(404).json({
      success: false,
      message: "No data found",
      data: [],
      error: { code: "NO_DATA_FOUND", details: null },
    });
    return ;
  }

  res.status(200).json({
    success: true,
    data: speciality.rows,
    count: speciality.count,
      pagination: {
        totalItems: speciality.count,
        totalPages: Math.ceil(speciality.count / limit),
        currentPage: pageNum,
        limit: limitNum,
      },
    error: null,
  });

  return; 
});

