import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Category from "../models/category.model";
import { publishEvent } from "../events/publisher";
import dotenv from "dotenv";
import { Op } from "sequelize";
dotenv.config();

// REGISTER - POST /category/register
export const Registeration: any = asyncHandler(async (req: any, res: Response) => {
  const { name } = req.body;


  const exist = await Category.findOne({ where: { name: name } });
  if (exist) {
    res.status(404).json({
      success: false,
      message: "Category is already exist",
      data: null,
      error: { code: "CATEGORY_ALREADY_EXISTS", details: null },
    });
    return;
  }

  const newCategory = await Category.create({
   name, 
  });

  await publishEvent("category_events", "CATEGORY_REGISTERED", {
    specialityId: newCategory.id,
    name: newCategory.name,
  });

  res.status(201).json({
    success: true,
    message: "Registeration completed successfully",
    data: null,
    error: null,
  });
});


// GET ONE - GET /Category/:id
export const getanCategory : any = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) {
    res.status(404).json({
      success: false,
      message: "Category not found",
      data: null,
      error: { code: "CATEGORY_NOT_FOUND", details: null },
    });
    return;
  }

  res.status(200).json({
    success: true,
    status: "Success",
    data: category,
    error: null,
  });
});

// UPDATE - PUT /speciality/:id
export const updateData: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updatePayload = req.body;

  const category = await Category.update(updatePayload, {
    where: { id: id },
    returning: true,
  });

  if (!category[1] || category[1].length === 0) {
    res.status(404).json({
      success: false,
      message: "category not found",
      status: 200,
      data: null,
      error: { code: "CATEGORY_NOT_FOUND", details: null },
    });
    return;
  }

  await publishEvent("category_events", "CATEGORY_UPDATED", {
    categoryId: category[1][0].id,
  });

  res.status(200).json({
    success: true,
    message: "successfully updated",
    data: category[1][0],
    error: null,
  });
});

// DELETE - DELETE /Category/:id
export const categoryDelete: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const category = await Category.findByPk(id);
  if (!category) {
    res.status(404).json({
      success: false,
      message: "category not found",
      data: null,
      error: { code: "CATEGORY_NOT_FOUND", details: null },
    });
    return;
  }

  // 🔥 Perform Soft Delete (requires paranoid: true in model)
  await category.destroy();

    await publishEvent("category_events", "CATEGORY_DELETED", {
    categoryId: category[1][0].id,
  });

  res.status(200).json({
    success: true,
    message: "category soft-deleted successfully",
    status: 200,
    data: null,
    error: null,
  });
});

// GET ALL - GET /Category
export const getCategorys = asyncHandler(async (req: Request, res: Response) : Promise<void> => {
 
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

  const category = await Category.findAndCountAll({
    where: whereCondition,
       limit,
    offset: (pageNum - 1) * limitNum,
    order: [["createdAt", "ASC"]],
  });

  if (category.count === 0) {
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
    data: category.rows,
    count: category.count,
       pagination: {
        totalItems: category.count,
        totalPages: Math.ceil(category.count / limit),
        currentPage: pageNum,
        limit: limitNum,
      },
    error: null,
  });

  return; 
});
