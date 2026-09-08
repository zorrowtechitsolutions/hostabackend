import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { patientVitalsService } from "../services/patientVitals.service";

// ADD VITALS
export const addVitals: any = asyncHandler(async (req: Request, res: Response) => {
  try {
    // const patientId = parseInt(req.params.patientId);
    const vitals = await patientVitalsService.addVitals(req.body.patientId, req.body);
    res.status(201).json({
      success: true,
      message: "Vitals recorded successfully",
      data: vitals,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message || "Server Error" });
  }
});

// GET ALL VITALS FOR A PATIENT
export const getVitalsByPatient: any = asyncHandler(async (req: Request, res: Response) => {
  try {
    const patientId = parseInt(req.params.patientId);
    const vitals = await patientVitalsService.getVitalsByPatient(patientId);
    res.status(200).json({
      success: true,
      data: vitals,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message || "Server Error" });
  }
});


// export const getAllVitals = asyncHandler(async (req: Request, res: Response) => {
//   try {
//     const vitals = await patientVitalsService.getAllVitals();

//     res.status(200).json({
//       success: true,
//       data: vitals,
//     });
//   } catch (error: any) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });
// GET LATEST VITALS FOR A PATIENT
export const getLatestVitals: any = asyncHandler(async (req: Request, res: Response) => {
  try {

    const normalizeQuery = (value: any) =>
      Array.isArray(value) ? value[0] : value;

    let {
     patientId
    }: any = req.query;

    patientId = normalizeQuery(patientId);
   
    const vitals = await patientVitalsService.getLatestVitals(Number(patientId));
    res.status(200).json({
      success: true,
      data: vitals,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message || "Server Error" });
  }
});

// GET ONE VITALS RECORD
export const getVitalsById: any = asyncHandler(async (req: Request, res: Response) => {
  try {
    

    const id = parseInt(req.params.id);
    const vitals = await patientVitalsService.getVitalsById(id);
    res.status(200).json({
      success: true,
      data: vitals,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message || "Server Error" });
  }
});

// UPDATE VITALS
export const updateVitals: any = asyncHandler(async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const vitals = await patientVitalsService.updateVitals(id, req.body);
    res.status(200).json({
      success: true,
      message: "Vitals updated successfully",
      data: vitals,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message || "Server Error" });
  }
});

// DELETE VITALS (soft delete)
export const deleteVitals: any = asyncHandler(async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await patientVitalsService.deleteVitals(id);
    res.status(200).json({
      success: true,
      message: "Vitals record deleted",
    });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message || "Server Error" });
  }
});
