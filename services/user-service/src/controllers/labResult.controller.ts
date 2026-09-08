import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import LabResult from "../models/labResult.model";
import { publishEvent } from "../events/publisher";
import { col, fn, Op, Sequelize, where } from "sequelize";

export const createLabResult: any = asyncHandler(async (req: Request, res: Response) => {
  const { labId, hospitalId, patientId, doctorId, department, testName,  status, userId, hospitalName, labName, patientName, doctorName } = req.body;

  const labResult = await LabResult.create({
    labId,
    hospitalId,
    patientId,
    doctorId,
    department,
    testName,
    status,
    userId,
    hospitalName,
    labName,
    patientName,
    doctorName,
  });


      await publishEvent("labresult_events", "LABRESULT_REGISTERED", {
      userId: userId,
    });

  res.status(201).json({
    success: true,
    message: "Lab result created successfully",
    data: labResult,
  });
});



export const getLabResults: any = asyncHandler(async (req: Request, res: Response) => {

    const normalizeQuery = (value: any) =>
      Array.isArray(value) ? value[0] : value;


        let {
      userId,
      patientId,
      hospitalId,
      labId,
      date,
      search_query,
      page = 1,
      limit = 10,
    }: any = req.query;

    patientId = normalizeQuery(patientId);
    page = normalizeQuery(page);
    limit = normalizeQuery(limit);
    hospitalId = normalizeQuery(hospitalId);
    labId = normalizeQuery(labId);
    userId = normalizeQuery(userId);
    search_query = normalizeQuery(search_query);
    date = normalizeQuery(date);
    


    const whereClause: any = {};
        const andConditions: any[] = [];

         const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 10, 1);

    if (patientId && !isNaN(Number(patientId))) {
      whereClause.patientId = Number(patientId);
    }

      if (userId && !isNaN(Number(userId))) {
      whereClause.userId = Number(userId);
    }

      if (hospitalId && !isNaN(Number(hospitalId))) {
      whereClause.hospitalId = Number(hospitalId);
    }

        if (labId && !isNaN(Number(labId))) {
      whereClause.labId = Number(labId);
    }



         if (date) {
          whereClause[Op.and] = [
            where(fn("DATE", col("createdAt")), date),
          ];
        }
    
          if (search_query?.trim()) {
              andConditions.push({
                [Op.or]: [
                
                    Sequelize.where(
                    Sequelize.fn(
                      "COALESCE",
                      Sequelize.col("department"),
                      ""
                    ),
                    {
                      [Op.iLike]: `%${search_query.trim()}%`,
                    }
                  ),


                    Sequelize.where(
                    Sequelize.fn(
                      "COALESCE",
                      Sequelize.col("testName"),
                      ""
                    ),
                    {
                      [Op.iLike]: `%${search_query.trim()}%`,
                    }
                  ),


                    Sequelize.where(
                    Sequelize.fn(
                      "COALESCE",
                      Sequelize.col("hospitalName"),
                      ""
                    ),
                    {
                      [Op.iLike]: `%${search_query.trim()}%`,
                    }
                  ),



                    Sequelize.where(
                    Sequelize.fn(
                      "COALESCE",
                      Sequelize.col("labName"),
                      ""
                    ),
                    {
                      [Op.iLike]: `%${search_query.trim()}%`,
                    }
                  ),

                     Sequelize.where(
                    Sequelize.fn(
                      "COALESCE",
                      Sequelize.col("doctorName"),
                      ""
                    ),
                    {
                      [Op.iLike]: `%${search_query.trim()}%`,
                    }
                  ),


                     Sequelize.where(
                    Sequelize.fn(
                      "COALESCE",
                      Sequelize.col("patientName"),
                      ""
                    ),
                    {
                      [Op.iLike]: `%${search_query.trim()}%`,
                    }
                  ),
                   
              
                ],
              });
            }
    


  const labResults = await LabResult.findAndCountAll({
      where: whereClause,
       limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    order: [["createdAt", "DESC"]],
  });



      res.status(200).json({
      success: true,
      data: labResults.rows,
      pagination: {
        totalItems: labResults.count,
        totalPages: Math.ceil(labResults.count / limitNum),
        currentPage: pageNum,
        limit: limitNum,
      },
      error: null,
    });



});

export const getLabResult: any = asyncHandler(async (req: Request, res: Response) => {
  const labResult = await LabResult.findOne({
    where: { id: req.params.id, isActive: true },
  });

  if (!labResult) {
    res.status(404).json({
      success: false,
      message: "Lab result not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: labResult,
  });
});

export const updateLabResult: any = asyncHandler(async (req: Request, res: Response) => {
  const labResult = await LabResult.findOne({
    where: { id: req.params.id, isActive: true },
  });

  if (!labResult) {
    res.status(404).json({
      success: false,
      message: "Lab result not found",
    });
    return;
  }

  await labResult.update(req.body);

    await publishEvent("labresult_events", "LABRESULT_UPDATED", {
      userId: labResult.userId,
    });

  res.status(200).json({
    success: true,
    message: "Lab result updated successfully",
    data: labResult,
  });
});

export const deleteLabResult: any = asyncHandler(async (req: Request, res: Response) => {
  const labResult = await LabResult.findOne({
    where: { id: req.params.id, isActive: true },
  });

  if (!labResult) {
    res.status(404).json({
      success: false,
      message: "Lab result not found",
    });
    return;
  }

  await labResult.update({ isActive: false });

    await publishEvent("labresult_events", "LABRESULT_DELETED", {
      userId: labResult.userId,
    });

  res.status(200).json({
    success: true,
    message: "Lab result deleted successfully",
  });
});