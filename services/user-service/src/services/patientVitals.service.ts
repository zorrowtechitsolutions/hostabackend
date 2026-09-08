import PatientVitals from "../models/patientVitals.model";
import Patient from "../models/patient.model";
import { logger } from "../utils/logger";
import { getVitalsById } from "../controllers/patientVitals.controller";

export const patientVitalsService = {
  /**
   * Add vitals for a patient.
   * Auto-calculates BMI if height + weight are provided.
   */
  async addVitals(patientId: number, data: any) {
    // Verify patient exists
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      throw { status: 404, message: "Patient not found" };
    }

    // 💡 Auto-calculate BMI: weight(kg) / (height(cm)/100)^2
    if (data.height && data.weight) {
      const heightInMeters = data.height / 100;
      data.bmi = parseFloat((data.weight / (heightInMeters ** 2)).toFixed(2));
    }

    // 💡 Auto-calculate BSA (Du Bois formula): 0.007184 × height^0.725 × weight^0.425
    if (data.height && data.weight) {
      data.bsa = parseFloat(
        (0.007184 * Math.pow(data.height, 0.725) * Math.pow(data.weight, 0.425)).toFixed(4)
      );
    }

    const vitals = await PatientVitals.create({
      ...data,
      patientId,
    });

    logger.info("Vitals recorded", { patientId, vitalsId: vitals.id });
    return vitals;
  },

  /**
   * Get all vitals records for a patient (newest first)
   */
  async getVitalsByPatient(patientId: number) {
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      throw { status: 404, message: "Patient not found" };
    }

    return await PatientVitals.findAll({
      where: { patientId },
      order: [["createdAt", "DESC"]],
    });
  },


  
  async getAllVitals() {
  return await PatientVitals.findAll({
    order: [["createdAt", "DESC"]],
  });
},

  /**
   * Get latest vitals for a patient
   */
  async getLatestVitals(patientId: number) {
   
    
    const patient = await Patient.findByPk(
 patientId,
);
    if (!patient) {
      throw { status: 404, message: "Patient not found" };
    }

    const vitals = await PatientVitals.findAll({
      where: { patientId },
      order: [["createdAt", "DESC"]],
    });

    if (!vitals) {
      throw { status: 404, message: "No vitals recorded for this patient" };
    }

    return vitals;
  },

  /**
   * Get a single vitals record by ID
   */
  async getVitalsById(id: number) {
    const vitals = await PatientVitals.findByPk(id);
    if (!vitals) {
      throw { status: 404, message: "Vitals record not found" };
    }
    return vitals;
  },

  /**
   * Update a vitals record
   */
  async updateVitals(id: number, data: any) {
    const vitals = await PatientVitals.findByPk(id);
    if (!vitals) {
      throw { status: 404, message: "Vitals record not found" };
    }

    // Re-calculate BMI if height or weight changed
    const height = data.height ?? vitals.height;
    const weight = data.weight ?? vitals.weight;

    if (height && weight) {
      const heightInMeters = height / 100;
      data.bmi = parseFloat((weight / (heightInMeters ** 2)).toFixed(2));
      data.bsa = parseFloat(
        (0.007184 * Math.pow(height, 0.725) * Math.pow(weight, 0.425)).toFixed(4)
      );
    }

    await vitals.update(data);
    logger.info("Vitals updated", { vitalsId: id });
    return vitals;
  },

  /**
   * Soft-delete a vitals record
   */
  async deleteVitals(id: number) {
    const vitals = await PatientVitals.findByPk(id);
    if (!vitals) {
      throw { status: 404, message: "Vitals record not found" };
    }

    await vitals.destroy(); // Soft delete (paranoid: true)
    logger.info("Vitals deleted (soft)", { vitalsId: id });
  },
};
