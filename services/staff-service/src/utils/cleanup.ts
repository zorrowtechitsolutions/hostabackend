import Staff from "../models/staff.model";
import { Op } from "sequelize";
import { logger } from "./logger";
import { publishEvent } from "../events/publisher";

/**
 * Periodically checks for staff members that have been in the blacklist for more than 30 days
 * and deletes them permanently.
 */
export const startCleanupJob = () => {
  // Run every 24 hours
  const INTERVAL = 24 * 60 * 60 * 1000;

  const performCleanup = async () => {
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      // Find staff blacklisted more than a month ago
      const staffToDelete = await Staff.findAll({
        where: {
          isDelete: true,
          deleteDate: {
            [Op.lte]: oneMonthAgo
          }
        },
        attributes: ['id', 'hospitalId']
      });

      if (staffToDelete.length > 0) {
        const ids = staffToDelete.map(s => s.id);
        
        await Staff.destroy({
          where: { id: ids },
          force: true // Hard delete from database
        });

        // Notify other services about permanent deletion
        for (const staff of staffToDelete) {
          await publishEvent("staff_events", "STAFF_DELETED", {
            staffId: staff.id,
            hospitalId: staff.hospitalId
          });
        }

        logger.info(`Cleanup Job: Permanently deleted ${ids.length} staff members from blacklist.`);
      }
    } catch (error) {
      logger.error("Cleanup Job Error in staff-service:", error);
    }
  };

  // Run once on startup
  performCleanup();

  // Then run periodically
  setInterval(performCleanup, INTERVAL);
};
