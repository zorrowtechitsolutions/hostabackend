import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import dotenv from "dotenv";
import Prescription from "../models/prescription.model";
import Hospital from "../models/hospital.model";
import { publishEvent } from "../events/publisher";

dotenv.config();


// ================= REGISTER =================
export const Registeration = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
    design,
      templateType,
      hospitalId,
      canvasBg
    } = req.body;

    // Check hospital
    if (hospitalId) {
      const existHospital = await Hospital.findOne({
        where: { id: hospitalId },
      });

      if (!existHospital) {
        res.status(404).json({
          success: false,
          message: "Hospital not found",
          data: null,
          error: {
            code: "HOSPITAL_NOT_FOUND",
            details: null,
          },
        });
        return;
      }

      // Check existing prescription
      const existPrescription = await Prescription.findOne({
        where: { hospitalId },
      });

      if (existPrescription) {
        res.status(409).json({
          success: false,
          message: "Prescription already exists",
          data: null,
          error: {
            code: "PRESCRIPTION_ALREADY_EXISTS",
            details: null,
          },
        });
        return;
      }
    }

    // Create prescription
    const newPrescription = await Prescription.create({
    hospitalId,
      templateType,
       design,
       canvasBg
    });




    // Publish event
    await publishEvent(
      "hospitalPrescription_events",
      "HOSPITALPRESCRIPTION_REGISTERED",
      {
        hospitalId,
      }
    );

    res.status(201).json({
      success: true,
      message: "Registration completed successfully",
      data: newPrescription,
      error: null,
    });
  }
);


// ================= GET PRESCRIPTION =================
export const getPrescription = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const normalizeQuery = (value: any) =>
      Array.isArray(value) ? value[0] : value;

    let { hospitalId }: any = req.query;

    hospitalId = normalizeQuery(hospitalId);

    const whereClause: any = {};

    if (hospitalId && !isNaN(Number(hospitalId))) {
      whereClause.hospitalId = Number(hospitalId);
    }

    const prescriptions = await Prescription.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

     const demoPrescription = await Prescription.findAll({
      where:{
      templateType: "demo"
      }, 
     
    order: [["createdAt", "ASC"]],
  });
  

  if (prescriptions.length === 0) {
     res.status(404).json({
      success: false,
      message: "No data found",
      data: [],
      demoPrescription,
      error: { code: "NO_DATA_FOUND", details: null },
    });
    return;
  }


    res.status(200).json({
      success: true,
      data: prescriptions,
      demoPrescription,
      error: null,
    });
  }
);


// ================= DELETE PRESCRIPTION =================
export const prescriptionDelete = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id, hospitalId } = req.params;

    // Check hospital
    const hospital = await Hospital.findOne({
      where: { id: hospitalId },
    });

    if (!hospital) {
      res.status(404).json({
        success: false,
        message: "Hospital not found",
        data: null,
        error: {
          code: "HOSPITAL_NOT_FOUND",
          details: null,
        },
      });
      return;
    }

    // Check prescription
    const prescription = await Prescription.findOne({
      where: {
        id,
        hospitalId,
      },
    });

    if (!prescription) {
      res.status(404).json({
        success: false,
        message: "Prescription not found",
        data: null,
        error: {
          code: "PRESCRIPTION_NOT_FOUND",
          details: null,
        },
      });
      return;
    }

    // Delete prescription
    await prescription.destroy();

    // Publish event
    await publishEvent(
      "hospitalPrescription_events",
      "HOSPITAL_PRESCRIPTION_DELETED",
      {
        hospitalId,
        prescriptionId: id,
      }
    );

    res.status(200).json({
      success: true,
      message: "Prescription deleted successfully",
      data: null,
      error: null,
    });
  }
);



// ================= GET PRESCRIPTION BY ID =================
export const getPrescriptionById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const prescription = await Prescription.findOne({
      where: { id },
    });

    if (!prescription) {
      res.status(404).json({
        success: false,
        message: "Prescription not found",
        data: null,
        error: {
          code: "PRESCRIPTION_NOT_FOUND",
          details: null,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: prescription,
      error: null,
    });
  }
);


// ================= UPDATE PRESCRIPTION =================
export const updatePrescription = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const {
        design,
      templateType,
      hospitalId,
      canvasBg,
    } = req.body;

    // Check prescription
    const prescription = await Prescription.findOne({
      where: { id },
    });

    if (!prescription) {
      res.status(404).json({
        success: false,
        message: "Prescription not found",
        data: null,
        error: {
          code: "PRESCRIPTION_NOT_FOUND",
          details: null,
        },
      });
      return;
    }

    // Check hospital if provided
    if (hospitalId) {
      const hospital = await Hospital.findOne({
        where: { id: hospitalId },
      });

      if (!hospital) {
        res.status(404).json({
          success: false,
          message: "Hospital not found",
          data: null,
          error: {
            code: "HOSPITAL_NOT_FOUND",
            details: null,
          },
        });
        return;
      }
    }

    // Update
    await prescription.update({
        design,
      templateType,
      hospitalId,
      canvasBg,
    });

    // Publish event
    await publishEvent(
      "hospitalPrescription_events",
      "HOSPITAL_PRESCRIPTION_UPDATED",
      {
        prescriptionId: id,
        hospitalId,
      }
    );

    res.status(200).json({
      success: true,
      message: "Prescription updated successfully",
      data: prescription,
      error: null,
    });
  }
);
