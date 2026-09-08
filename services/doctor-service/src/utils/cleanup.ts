import Doctor from "../models/doctor.model";
import { Op } from "sequelize";
import { logger } from "./logger";
import { publishEvent } from "../events/publisher";

/**
 * Periodically checks for doctors that have been in the blacklist for more than 30 days
 * and deletes them permanently.
 */
export const startCleanupJob = () => {
  // Run every 24 hours
  const INTERVAL = 24 * 60 * 60 * 1000;

  const performCleanup = async () => {
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      // Find doctors blacklisted more than a month ago
      const doctorsToDelete = await Doctor.findAll({
        where: {
          isDelete: true,
          deleteDate: {
            [Op.lte]: oneMonthAgo
          }
        },
        attributes: ['id', 'hospitalId']
      });

      if (doctorsToDelete.length > 0) {
        const ids = doctorsToDelete.map(d => d.id);
        
        await Doctor.destroy({
          where: { id: ids },
          force: true // Hard delete from database
        });

        // Notify other services about permanent deletion
        for (const doctor of doctorsToDelete) {
          await publishEvent("doctor_events", "DOCTOR_DELETED", {
            doctorId: doctor.id,
            hospitalId: doctor.hospitalId
          });
        }

        logger.info(`Cleanup Job: Permanently deleted ${ids.length} doctors from blacklist.`);
      }
    } catch (error) {
      logger.error("Cleanup Job Error in doctor-service:", error);
    }
  };

  // Delay first run by 30s to allow DB sync to finish creating tables
  setTimeout(() => {
    performCleanup();
    // Then run periodically every 24 hours
    setInterval(performCleanup, INTERVAL);
  }, 30000);
};
