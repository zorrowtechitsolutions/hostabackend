import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import BloodBank from "../models/bloodBank.model";
import { httpClient } from "../utils/httpClient";
import { publishEvent } from "../events/publisher";
import { QueryTypes } from "sequelize";
import { env } from "../config/env";
const VALID_BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

// const [lastStock]: any = await BloodBank.sequelize!.query(
//   `
//   SELECT COALESCE(MAX("stockNumber"), 0) AS "maxNum"
//   FROM "blood_banks"
//   WHERE "hospitalId" = :hospitalId
//   `,
//   {
//     replacements: { hospitalId },
//     type: QueryTypes.SELECT,
//   }
// );

// const stockNumber = Number(lastStock?.maxNum || 0) + 1;
// 🧩 Create or Update Stock (scoped by hospitalId)
export const createOrUpdateStock = asyncHandler(async (req: any, res: Response) => {
  const { hospitalId, bloodGroup, count,  
 } = req.body;


  let hospitalName = "";
  // 🏥 Validate Hospital (Cross-Service: hospital-service)
  try {
    const hospitalRes = await httpClient.get(`${env.HOSPITAL_SERVICE_URL}/hospital/${hospitalId}`, {
      headers: { Authorization: req.headers.authorization }
    });
    hospitalName = hospitalRes.data?.data?.name || hospitalRes.data?.name || "";
  } catch (error: any) {
    console.error("Hospital validation failed:", error.message);
    res.status(404).json({
      success: false,
      message: `Hospital with ID ${hospitalId} does not exist in the hospital service.`,
      error: { code: "HOSPITAL_NOT_FOUND" }
    });
    return;
  }

  if (!VALID_BLOOD_GROUPS.includes(bloodGroup)) {
    res.status(400).json({
      success: false,
      message: `Invalid blood group. Must be one of: ${VALID_BLOOD_GROUPS.join(", ")}`
    });
    return;
  }

  // Smart Upsert Logic — scoped by hospitalId + bloodGroup
  let stock = await BloodBank.findOne({ where: { hospitalId, bloodGroup } });

  if (stock) {
    // ⚔️ Add to existing count
    const newCount = Number(stock.count) + Number(count || 0);
    await stock.update({ count: newCount });

    await publishEvent("blood_bank_events", "STOCK_UPDATED", {
      hospitalId,
      hospitalName,
      bloodGroup,
      count: newCount,
      action: "added"
    });

    res.status(200).json({
      success: true,
      message: `Added ${count} units. New total for ${bloodGroup} is ${newCount} units for hospital ${hospitalId}`,
      data: stock
    });
  } else {
  // Generate next stock number for this hospital
  const [lastStock]: any = await BloodBank.sequelize!.query(
    `
    SELECT COALESCE(MAX("stockNumber"), 0) AS "maxNum"
    FROM "blood_banks"
    WHERE "hospitalId" = :hospitalId
    `,
    {
      replacements: { hospitalId },
      type: QueryTypes.SELECT,
    }
  );

  const stockNumber = Number(lastStock?.maxNum || 0) + 1;

  // Create new record
  stock = await BloodBank.create({
    hospitalId,
    bloodGroup,
    count: count || 0,
    stockNumber,
  });

  await publishEvent("blood_bank_events", "STOCK_CREATED", {
    hospitalId,
    hospitalName,
    bloodGroup,
    count: count || 0,
  });

  res.status(201).json({
    success: true,
    message: `Blood group ${bloodGroup} record created with ${count} units for hospital ${hospitalId}`,
    data: stock,
  });
}
});

// 🔍 Get All Inventory



export const getAllStock = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  let { hospitalId, bloodGroup, search_query }: any = req.query;

  if (Array.isArray(hospitalId)) hospitalId = hospitalId[0];
  if (Array.isArray(bloodGroup)) bloodGroup = bloodGroup[0];
  if (Array.isArray(search_query)) search_query = search_query[0];

  const whereClause: any = {
    isDelete: false,
  };

  // hospital filter
  if (hospitalId) {
    whereClause.hospitalId = Number(hospitalId);
  }

  /**
   * ✅ ENUM SAFE FILTERING
   */
  if (search_query) {
    whereClause.bloodGroup = search_query;
  } else if (bloodGroup) {
    whereClause.bloodGroup = bloodGroup;
  }

  const stocks = await BloodBank.findAll({
    where: whereClause,
    order: [["bloodGroup", "ASC"]],
  });



    if (!stocks.length) {
      res.status(200).json({
        success: false,
        message: "No data found",
        data: [],
      });
      return;
    }

  res.status(200).json({
    success: true,
    count: stocks.length,
    data: stocks,
  });
  return;
});



// 🔍 Get All Stocks by Hospital ID
export const getStocksByHospitalId = asyncHandler(async (req: Request, res: Response) => {
  const { hospitalId } = req.params;

  const stocks = await BloodBank.findAll({
    where: { hospitalId },
    order: [['bloodGroup', 'ASC']]
  });

  if (stocks.length === 0) {
    res.status(404).json({
      success: false,
      message: `No blood bank inventory found for hospital ${hospitalId}`,
      data: null,
      error: { code: "NO_DATA_FOUND", details: null }
    });
    return;
  }

  res.status(200).json({ success: true, count: stocks.length, data: stocks });
});

// 🔍 Get One Stock by ID
export const getStockById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const stock = await BloodBank.findByPk(id);
  if (!stock) {
    res.status(404).json({ success: false, message: `No inventory record found with ID ${id}` });
    return;
  }
  res.status(200).json({ success: true, data: stock });
});

// ✏️ Update Stock by ID
export const updateStockById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { count } = req.body;

  const stock = await BloodBank.findByPk(id);
  if (!stock) {
    res.status(404).json({ success: false, message: `No inventory record found with ID ${id}` });
    return;
  }


  let hospitalName = "";
  if (stock.hospitalId) {
    try {
      const hospitalRes = await httpClient.get(`${env.HOSPITAL_SERVICE_URL}/hospital/${stock.hospitalId}`, {
        headers: { Authorization: req.headers.authorization }
      });
      hospitalName = hospitalRes.data?.data?.name || hospitalRes.data?.name || "";
    } catch (err) {}
  }

  await stock.update({ count });

  await publishEvent("blood_bank_events", "STOCK_UPDATED", {
    hospitalId: stock.hospitalId,
    hospitalName,
    bloodGroup: stock.bloodGroup,
    count: count,
    action: "manual_update"
  });

  res.status(200).json({ success: true, message: "Inventory updated successfully", data: stock });
});

// ❌ Delete Stock by ID (Soft Delete)
export const deleteStockById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const stock = await BloodBank.findByPk(id);
  if (!stock) {
    res.status(404).json({ success: false, message: `No inventory record found with ID ${id}` });
    return;
  }

  // Soft Delete (paranoid mode)

  let hospitalName = "";
  if (stock.hospitalId) {
    try {
      const hospitalRes = await httpClient.get(`${env.HOSPITAL_SERVICE_URL}/hospital/${stock.hospitalId}`, {
        headers: { Authorization: req.headers.authorization }
      });
      hospitalName = hospitalRes.data?.data?.name || hospitalRes.data?.name || "";
    } catch (err) {}
  }

    await stock.destroy({ force: true });



  await publishEvent("blood_bank_events", "STOCK_DELETED", {
    hospitalId: stock.hospitalId,
    hospitalName,
    bloodGroup: stock.bloodGroup,
    count: stock.count || 0
  });

  res.status(200).json({ success: true, message: "Inventory record soft-deleted successfully" });
});
