



import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Document from "../models/document.model";
import { publishEvent } from "../events/publisher";
import { col, fn, Op, Sequelize, where } from "sequelize";

// Helper to normalize single query params (in case of array)
const normalizeQuery = (value: any): string | undefined =>
  Array.isArray(value) ? value[0] : value;

// Optional: simple validation function (replace with Joi/Zod if needed)
const validateDocumentInput = (body: any) => {
  const { patientId, name, date, userId, hospitalId } = body;
  if (!patientId || !name || !date || !userId || !hospitalId) {
    throw new Error("Missing required fields: patientId, name, date, userId, hospitalId");
  }
  if (isNaN(Number(patientId)) || isNaN(Number(userId)) || isNaN(Number(hospitalId))) {
    throw new Error("patientId, userId, and hospitalId must be numbers");
  }
  if (isNaN(Date.parse(date))) {
    throw new Error("Invalid date format");
  }
};

// Create Document
export const createDocument = asyncHandler(async (req: Request, res: Response) => {
  try {
    validateDocumentInput(req.body);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
    return;
  }

  const { patientId, name, date, userId, hospitalId } = req.body;

  const document = await Document.create({
    patientId: Number(patientId),
    name,
    date,
    hospitalId: Number(hospitalId),
    userId: Number(userId)
  });

  // Publish event (non-blocking)
  try {
    await publishEvent("document_events", "DOCUMENT_REGISTERED", { userId: document.userId });
  } catch (eventError) {
    console.error("Failed to publish DOCUMENT_REGISTERED event:", eventError);
    // Do not fail the request; log and continue
  }

  res.status(201).json({
    success: true,
    message: "Document created successfully",
    data: document
  });
});

// Get Documents with Pagination, Filtering, and Search
export const getDocuments = asyncHandler(async (req: Request, res: Response) => {
  // Normalize query parameters
  let {
    userId,
    patientId,
    hospitalId,
    date,
    search_query,
    page = 1,
    limit = 10
  } = req.query;

  userId = normalizeQuery(userId);
  patientId = normalizeQuery(patientId);
  hospitalId = normalizeQuery(hospitalId);
  date = normalizeQuery(date);
  search_query = normalizeQuery(search_query);
  page = normalizeQuery(page);
  limit = normalizeQuery(limit);

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.max(Number(limit) || 10, 1);

  const whereClause: any = {};
  const andConditions: any[] = [];

  // Filter by IDs (only if valid numbers)
  if (patientId && !isNaN(Number(patientId))) {
    whereClause.patientId = Number(patientId);
  }
  if (userId && !isNaN(Number(userId))) {
    whereClause.userId = Number(userId);
  }
  if (hospitalId && !isNaN(Number(hospitalId))) {
    whereClause.hospitalId = Number(hospitalId);
  }

  // Date filter: compare DATE(createdAt) = given date
  if (date) {
    andConditions.push(where(fn("DATE", col("createdAt")), date));
  }

  // Search query: case-insensitive search on 'name' field
  if (search_query?.trim()) {
    andConditions.push({
      [Op.or]: [
        Sequelize.where(
          Sequelize.fn("COALESCE", Sequelize.col("name"), ""),
          { [Op.iLike]: `%${search_query.trim()}%` }
        )
      ]
    });
  }

  // Combine all AND conditions
  if (andConditions.length) {
    whereClause[Op.and] = andConditions;
  }

  // Execute query with pagination
  const documents = await Document.findAndCountAll({
    where: whereClause,
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
    order: [["createdAt", "DESC"]]
  });

  res.status(200).json({
    success: true,
    data: documents.rows,
    pagination: {
      totalItems: documents.count,
      totalPages: Math.ceil(documents.count / limitNum),
      currentPage: pageNum,
      limit: limitNum
    },
    error: null
  });
});

// Get Single Document by ID
export const getDocument = asyncHandler(async (req: Request, res: Response) => {
  const document = await Document.findOne({
    where: { id: req.params.id, isActive: true }
  });

  if (!document) {
    res.status(404).json({
      success: false,
      message: "Document not found"
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: document
  });
});

// Update Document
export const updateDocument = asyncHandler(async (req: Request, res: Response) => {
  // Optional: validate update payload (e.g., at least one field)
  const document = await Document.findOne({
    where: { id: req.params.id }
  });

  if (!document) {
    res.status(404).json({
      success: false,
      message: "Document not found"
    });
    return;
  }

  await document.update(req.body);

  // Publish event (non-blocking)
  try {
    await publishEvent("document_events", "DOCUMENT_UPDATED", { userId: document.userId });
  } catch (eventError) {
    console.error("Failed to publish DOCUMENT_UPDATED event:", eventError);
  }

  res.status(200).json({
    success: true,
    message: "Document updated successfully",
    data: document
  });
});

// Delete Document (hard delete – if you prefer soft-delete, see note below)
export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  const document = await Document.findByPk(req.params.id);

  if (!document) {
    res.status(404).json({
      success: false,
      message: "Document not found"
    });
    return;
  }

  // Hard delete
  await document.destroy();

  // Publish event (non-blocking)
  try {
    await publishEvent("document_events", "DOCUMENT_DELETED", { userId: document.userId });
  } catch (eventError) {
    console.error("Failed to publish DOCUMENT_DELETED event:", eventError);
  }

  res.status(200).json({
    success: true,
    message: "Document deleted successfully"
  });
});