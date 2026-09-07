import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Patient from "../models/patient.model";
import Prescription from "../models/prescription.model";
import User from "../models/user.model";
import { publishEvent } from "../events/publisher";
import { httpClient } from "../utils/httpClient";
import dotenv from "dotenv";
import PatientVitals from "../models/patientVitals.model";
import { Op, Sequelize, QueryTypes } from "sequelize";
import { fn, col, where } from "sequelize";
dotenv.config();


// GET ALL USERS Prescription


export const createPrescription: any = asyncHandler(async (req: Request, res: Response) => {

  
  const { bookingId, hospitalId, doctorId, patientId, userId, complaint, medications, investigations, advice, next_consultation, empty_stomach, prescribedBy,
   canvasBg,
  design,
  hospitalName,
  patientName,
  age,
  contact,
  gender,
    } = req.body;

      const {
      temperature, pulse, respiratoryRate, spo2, height, weight, waist
    } = req.body;
 
 

  const errors: string[] = [];

  // 1. Fetch Hospital and Doctor in parallel
  console.log("Fetching hospital and doctor in parallel...");
  const [hospitalResPromise, doctorResPromise] = await Promise.allSettled([
    httpClient.get(`${process.env.HOSPITAL_SERVICE_URL}/hospital/${hospitalId}`, { headers: { Authorization: req.headers.authorization } }),
    httpClient.get(`${process.env.DOCTOR_SERVICE_URL}/doctor/${doctorId}`, { headers: { Authorization: req.headers.authorization } })
  ]);

  let fetchedHospitalName = hospitalName;
  if (hospitalResPromise.status === 'fulfilled') {
    const hospitalRes = hospitalResPromise.value;
    if (!fetchedHospitalName && hospitalRes.data?.data?.name) {
      fetchedHospitalName = hospitalRes.data.data.name;
    }
  } else {
    console.error("Hospital validation failed:", hospitalResPromise.reason.message);
    errors.push(`Hospital with ID ${hospitalId} does not exist or is unreachable.`);
  }

  let fetchedDoctorName = "";
  if (doctorResPromise.status === 'fulfilled') {
    const doctorResponse = doctorResPromise.value;
    fetchedDoctorName = doctorResponse.data?.data?.displayName || doctorResponse.data?.data?.name || ""; 
  } else {
    console.error("Doctor validation failed:", doctorResPromise.reason.message);
    errors.push(`Doctor with ID ${doctorId} does not exist or is unreachable.`);
  }

  // 2. Validate / Auto-Create Patient
  let finalPatientId = patientId;
  let patientExists = null;

  if (finalPatientId) {
    console.log("Fetching patient by patientNumber...");
    patientExists = await Patient.findOne({ where: { patientNumber: finalPatientId, isDelete: false } });
    console.log("Patient fetched:", !!patientExists);
    if (patientExists) {
      finalPatientId = patientExists.patientNumber;
    }
  }

  // Auto Create Patient if not found but we have a userId
  if (!patientExists && userId) {
    console.log("Patient not found by patientNumber, checking by userId + hospitalId...");
    
    // First check if patient already exists for this user at this hospital
    patientExists = await Patient.findOne({ 
      where: { userId, hospitalId, isDelete: false } 
    });

    if (patientExists) {
      console.log("Existing patient found for userId + hospitalId:", patientExists.patientNumber);
      finalPatientId = patientExists.patientNumber;
    } else {
      console.log("No existing patient found, auto-creating patient...");
      const user = await User.findOne({ where: { id: userId, isDelete: false } });
      console.log("User fetched:", !!user);

      let booking: any;
      try {
        console.log("Fetching booking...");
        booking = await httpClient.get(
          `${process.env.BOOKING_SERVICE_URL}/booking/${bookingId}`,
          { headers: { Authorization: req.headers.authorization } }
        );
        console.log("Booking fetched successfully");
      } catch (error: any) {
         console.error("Booking fetch failed:", error.message);
         res.status(error.response?.status || 500).json({
          success: false,
          message: error.response?.data?.message || error.response?.data?.error || "Booking service error",
          error: error.response?.data,
        });
        return;
      }

      const dob = booking?.data?.data?.patient_dob;
      let formattedDob = null;
      if (dob) {
        const [day, month, year] = dob.split("/");
        formattedDob = `${year}-${month}-${day}`;
      }

      if (user) {
        console.log("Creating new patient in DB...");
        // Generate hospital-scoped patientNumber
        const [lastResult]: any = await Patient.sequelize!.query(
          `SELECT COALESCE(MAX("patientNumber"), 0) AS "maxNum" FROM "patients" WHERE "hospitalId" = :hospitalId`,
          {
            replacements: { hospitalId },
            type: QueryTypes.SELECT,
          }
        );
        const patientNumber = (lastResult?.maxNum || 0) + 1;

        patientExists = await Patient.create({
          userId: user.id,
          hospitalId: hospitalId,
          hospitalName: fetchedHospitalName || "Unknown Hospital",
          name: booking?.data?.data?.patient_name,
          gender: booking?.data?.data?.patient_gender,
          age: booking?.data?.data?.patient_age,
          dob: formattedDob,
          mobileNumber:  booking?.data?.data?.patient_phone,
          addressLine: booking?.data?.data?.patient_place,
          location: { place: booking?.data?.data?.patient_place, pincode: 0 },
          patientNumber,
        });
        console.log("New patient created with patientNumber:", patientNumber);
        
        finalPatientId = patientExists.patientNumber;
      } else {
        errors.push(`User with ID ${userId} does not exist. Cannot auto-create patient.`);
      }
    }
  } else if (!patientExists) {
    errors.push(`Patient with ID ${patientId} does not exist and no userId provided to auto-create.`);
  }

  // 4. Return all errors if any
  if (errors.length > 0) {
    res.status(404).json({
      success: false,
      message: "Validation failed",
      errors: errors
    });
    return;
  }

  const finalUserId = patientExists ? patientExists.userId : userId;

  console.log("Creating Prescription in DB...");
  // 4. Create Prescription
  const prescription = await Prescription.create({
    bookingId, hospitalId, doctorId, patientId: finalPatientId, userId: finalUserId, complaint, medications, investigations, advice, next_consultation, empty_stomach, prescribedBy, 
   canvasBg,
  design,
   hospitalName: fetchedHospitalName,
  patientName,
    age,
  contact,
  gender,
  });
  console.log("Prescription created.");


     // 4. If any vitals field is provided, create a vitals record
    if (temperature || pulse || respiratoryRate || spo2 || height || weight || waist) {
      // We'll calculate BMI/BSA here or let the service handle it.
      // Since addVitals in patientVitalsService handles calculation, let's use a helper or just do it here to keep things in one transaction.
      
      let bmi, bsa;
      if (height && weight) {
        const hInM = height / 100;
        bmi = parseFloat((weight / (hInM * hInM)).toFixed(2));
        bsa = parseFloat((0.007184 * Math.pow(height, 0.725) * Math.pow(weight, 0.425)).toFixed(4));
      }
      

      await PatientVitals.create({
        prescriptionId: prescription.id,
        patientId: patientExists?.id,
        temperature, pulse, respiratoryRate, spo2,
        height, weight, waist, bmi, bsa
      });
    }

  void publishEvent(
    "prescription_events",
    "PRESCRIPTION_CREATED",
    {
      prescriptionId: prescription.id,
      bookingId,
      doctorId,
      patientId: finalPatientId,
      userId: finalUserId,
      hospitalId: prescription.hospitalId,
      doctorName: fetchedDoctorName,
      hospitalName: fetchedHospitalName,
    }
  );

  res.status(201).json({
    success: true,
    message: "Prescription created successfully",
    data: prescription,
  });
});



export const getPrescription = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {

    const normalizeQuery = (value: any) =>
      Array.isArray(value) ? value[0] : value;

    let {
      bookingId,
      userId,
      patientId,
      doctorId,
      date,
      hospitalId,
      prescribedBy,
      search_query,
      page = 1,
      limit = 10,
    }: any = req.query;



    
    bookingId = normalizeQuery(bookingId);
    userId = normalizeQuery(userId);
    patientId = normalizeQuery(patientId);
    doctorId = normalizeQuery(doctorId);
    date = normalizeQuery(date);
    hospitalId = normalizeQuery(hospitalId);
    prescribedBy = normalizeQuery(prescribedBy);
    search_query = normalizeQuery(search_query);



    page = normalizeQuery(page);
    limit = normalizeQuery(limit);
  

    const whereClause: any = {};
    const andConditions: any[] = [];

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 10, 1);




    if (hospitalId) whereClause.hospitalId = Number(hospitalId);

    if (bookingId) whereClause.bookingId = Number(bookingId);

    if (userId) whereClause.userId = Number(userId);

    if (doctorId) whereClause.doctorId = Number(doctorId);

    if (patientId) whereClause.patientId = Number(patientId);

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
              Sequelize.col("prescribedBy"),
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
              Sequelize.col("patientName"),
              ""
            ),
            {
              [Op.iLike]: `%${search_query.trim()}%`,
            }
          ),
           
            Sequelize.where(
            Sequelize.fn(
              "COALESCE",
              Sequelize.col("complaint"),
              ""
            ),
            {
              [Op.iLike]: `%${search_query.trim()}%`,
            }
          ),
        ],
      });
    }



    if (andConditions.length) {
      whereClause[Op.and] = andConditions;
    }

    const prescription = await Prescription.findAndCountAll({
      where: whereClause,
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: prescription.rows,
      pagination: {
        totalItems: prescription.count,
        totalPages: Math.ceil(prescription.count / limitNum),
        currentPage: pageNum,
        limit: limitNum,
      },
      error: null,
    });
  }
);


// GET ONE USER prescription
export const getAPrescription: any = asyncHandler(async (req: Request, res: Response) => {
  const prescription = await Prescription.findOne({ where: { id: req.params.id, isDelete: false } });

  if (!prescription) {
    res.status(404).json({
      success: false,
      message: "Prescription not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: prescription,
  });
});

// UPDATE - PUT /prescription/:id
export const updateData: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { vitals, ...updatePayload } = req.body;

  const prescription : any = await Prescription.update(updatePayload, {
    where: { id: id, isDelete: false },
    returning: true,
  });

   // 2. Check for NEW Vitals in the same request
    const {
      temperature, pulse, respiratoryRate, spo2, height, weight, waist, patientId
    } = req.body;

    if (temperature || pulse || respiratoryRate || spo2 || height || weight || waist) {
      let bmi, bsa;
      if (height && weight) {
        const hInM = height / 100;
        bmi = parseFloat((weight / (hInM * hInM)).toFixed(2));
        bsa = parseFloat((0.007184 * Math.pow(height, 0.725) * Math.pow(weight, 0.425)).toFixed(4));
      }

      await PatientVitals.create({
        prescriptionId: prescription.id,
        patientId,
        temperature, pulse, respiratoryRate, spo2,
        height, weight, waist, bmi, bsa
      });
    }


  if (!prescription[1] || prescription[1].length === 0) {
    res.status(404).json({
      success: false,
      message: "Prescription not found",
      status: 200,
      data: null,
      error: { code: "PRESCRIPTION_NOT_FOUND", details: null },
    });
    return;
  }





  const patient = await Patient.findOne({ where: { id: prescription[1][0].patientId, isDelete: false } });

  // 🔄 Save/Update Vitals if provided
  if (vitals && typeof vitals === 'object') {
    const existingVitals = await PatientVitals.findOne({ where: { prescriptionId: id } });
    
    if (existingVitals) {
      await existingVitals.update(vitals);
    } else {
      await PatientVitals.create({
        ...vitals,
        patientId: patient ? patient.id : null,
        prescriptionId: id
      });
    }
  }

  let doctorName = "";
  let hospitalName = "";
  try {
    const doctorRes = await httpClient.get(
      `${process.env.DOCTOR_SERVICE_URL}/doctor/${prescription[1][0].doctorId}`,
      { headers: { Authorization: req.headers.authorization } },
    );
    doctorName = doctorRes.data?.data?.displayName || "";
  } catch (err: any) {
    console.error("⚠️ Failed to fetch doctor name for prescription event:", err.message);
  }

  try {
    const hospitalRes = await httpClient.get(
      `${process.env.HOSPITAL_SERVICE_URL}/hospital/${prescription[1][0].hospitalId}`,
      { headers: { Authorization: req.headers.authorization } },
    );
    hospitalName = hospitalRes.data?.data?.hospitalName || "";
  } catch (err: any) {
    console.error("⚠️ Failed to fetch hospital name for prescription event:", err.message);
  }

  await publishEvent("prescription_events", "PRESCRIPTION_UPDATED", {
    prescriptionId: prescription[1][0].id,
    userId: patient ? patient.userId : null,
    hospitalId: prescription[1][0].hospitalId,
    doctorName: doctorName,
    hospitalName: hospitalName,
  });




  // Re-fetch to optionally include vitals
  const updatedPrescription = prescription[1][0].toJSON();
  if (vitals) {
    (updatedPrescription as any).vitals = vitals;
  }





  res.status(200).json({
    success: true,
    message: "successfully updated",


    
    data: updatedPrescription,


    error: null,
  });
});

// DELETE USER prescription
export const deletePrescription: any = asyncHandler(async (req: Request, res: Response) => {
  const user = await Prescription.findOne({ where: { id: req.params.id, isDelete: false } });

  if (!user) {
    res.status(404).json({
      success: false,
      message: "Prescription not found",
    });
    return;
  }

  // 🔥 Move to blacklist (soft delete)
  await user.update({
    isActive: false,
    isDelete: true,
    deleteDate: new Date(),
  });

  

  const patient = await Patient.findOne({ where: { id: user.patientId, isDelete: false } });

  let doctorName = "";
  let hospitalName = "";
  try {
    const doctorRes = await httpClient.get(
      `${process.env.DOCTOR_SERVICE_URL}/doctor/${user.doctorId}`,
      { headers: { Authorization: req.headers.authorization } },
    );
    doctorName = doctorRes.data?.data?.displayName || "";
  } catch (err: any) {
    console.error("⚠️ Failed to fetch doctor name for prescription event:", err.message);
  }

  try {
    const hospitalRes = await httpClient.get(
      `${process.env.HOSPITAL_SERVICE_URL}/hospital/${user.hospitalId}`,
      { headers: { Authorization: req.headers.authorization } },
    );
    hospitalName = hospitalRes.data?.data?.hospitalName || "";
  } catch (err: any) {
    console.error("⚠️ Failed to fetch hospital name for prescription event:", err.message);
  }

  await publishEvent(
    "prescription_events",
    "PRESCRIPTION_DELETED",
    {
      prescriptionId: Number(req.params.id),
      userId: patient ? patient.userId : null,
      hospitalId: user.hospitalId,
      doctorName: doctorName,
      hospitalName: hospitalName,
    }
  );


  res.status(200).json({
    success: true,
    message: "Prescription deleted successfully",
  });
});






