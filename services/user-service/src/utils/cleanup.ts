import User from "../models/user.model";
import Patient from "../models/patient.model";
import Prescription from "../models/prescription.model";
import { Op } from "sequelize";
import { logger } from "./logger";
import { publishEvent } from "../events/publisher";

/**
 * Periodically checks for users, patients, and prescriptions that have been in the blacklist
 * for more than 30 days and deletes them permanently.
 */
export const startCleanupJob = () => {
  // Run every 24 hours
  const INTERVAL = 24 * 60 * 60 * 1000;

  const performCleanup = async () => {
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      // 1. Cleanup Users
      const usersToDelete = await User.findAll({
        where: {
          isDelete: true,
          deleteDate: {
            [Op.lte]: oneMonthAgo
          }
        },
        attributes: ['id']
      });

      if (usersToDelete.length > 0) {
        const ids = usersToDelete.map(u => u.id);
        await User.destroy({
          where: { id: ids },
          force: true // Hard delete
        });

        for (const id of ids) {
          await publishEvent('user_events', 'user.deleted', { userId: id });
        }
        logger.info(`Cleanup Job (User): Permanently deleted ${ids.length} users from blacklist.`);
      }

      // 2. Cleanup Patients
      const patientsToDelete = await Patient.findAll({
        where: {
          isDelete: true,
          deleteDate: {
            [Op.lte]: oneMonthAgo
          }
        },
        attributes: ['id', 'userId', 'hospitalId']
      });

      if (patientsToDelete.length > 0) {
        const ids = patientsToDelete.map(p => p.id);
        await Patient.destroy({
          where: { id: ids },
          force: true
        });

        for (const patient of patientsToDelete) {
          await publishEvent('patient_events', 'PATIENT_DELETED', {
            patientId: patient.id,
            userId: patient.userId || null,
            hospitalId: patient.hospitalId || null
          });
        }
        logger.info(`Cleanup Job (Patient): Permanently deleted ${ids.length} patients from blacklist.`);
      }

      // 3. Cleanup Prescriptions
      const prescriptionsToDelete = await Prescription.findAll({
        where: {
          isDelete: true,
          deleteDate: {
            [Op.lte]: oneMonthAgo
          }
        },
        attributes: ['id']
      });

      if (prescriptionsToDelete.length > 0) {
        const ids = prescriptionsToDelete.map(pr => pr.id);
        await Prescription.destroy({
          where: { id: ids },
          force: true
        });

        for (const id of ids) {
          await publishEvent('prescription_events', 'PRESCRIPTION_DELETED', { prescriptionId: id });
        }
        logger.info(`Cleanup Job (Prescription): Permanently deleted ${ids.length} prescriptions from blacklist.`);
      }

    } catch (error) {
      logger.error("Cleanup Job Error in user-service:", error);
    }
  };

  // Run once on startup
  performCleanup();

  // Then run periodically
  setInterval(performCleanup, INTERVAL);
};
