import Hospital from "../models/hospital.model";
import { Op } from "sequelize";
import { logger } from "./logger";
import { publishEvent } from "../events/publisher";

/**
 * Periodically checks for hospitals that have been in the blacklist for more than 30 days
 * and deletes them permanently.
 */
export const startCleanupJob = () => {
  // Run every 24 hours
  const INTERVAL = 24 * 60 * 60 * 1000;

  // const INTERVAL = 60 * 1000; // every 1 minute
  

  const performCleanup = async () => {
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      // const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

      // Find hospitals blacklisted more than a month ago
      const hospitalsToDelete = await Hospital.findAll({
        where: {
          isDelete: true,
          deleteDate: {
            [Op.lte]: oneMonthAgo 
          }
        },
        attributes: ["id", "name", "email"],
      });

      if (hospitalsToDelete.length > 0) {
        const ids = hospitalsToDelete.map((h) => h.id);
        
        await Hospital.destroy({
          where: { id: ids },
          force: true, // Hard delete from database
        });

        // Notify other services about permanent deletion
        for (const hospital of hospitalsToDelete) {
          await publishEvent("hospital_events", "HOSPITAL_DELETED", {
            hospitalId: hospital.id,
            hospitalName: hospital.name,
            email: hospital.email,
          });
        }

        logger.info(`Cleanup Job: Permanently deleted ${ids.length} hospitals from blacklist.`);
      }
    } catch (error) {
      logger.error("Cleanup Job Error:", error);
    }
  };

  // Run once on startup
  performCleanup();

  // Then run periodically
  setInterval(performCleanup, INTERVAL);
};
