import Notification from "../models/notification.model";
import { safeSocketEmit } from "../utils/socket.emitter";

export const handleBloodEvent = async (routingKey: string, content: any) => {
  if (routingKey === "DONOR_REGISTERED" || routingKey === "DONOR_UPDATED" || routingKey === "DONOR_DELETED") {
    let msg = "";
    if (routingKey === "DONOR_REGISTERED") {
      msg = `New blood donor registered: (ID: ${content.donorId}, Blood Group: ${content.bloodGroup || "Unknown"})`;
    } else if (routingKey === "DONOR_UPDATED") {
      msg = `Blood donor profile updated: (ID: ${content.donorId})`;
    } else if (routingKey === "DONOR_DELETED") {
      msg = `Blood donor profile deleted: (ID: ${content.donorId})`;
    }

    await Notification.create({
      superAdminIds: [1],
      message: msg,
    }).catch((err) => console.error(`Failed to save ${routingKey} notification`, err));

    safeSocketEmit("role_1", "blood_events", { event: routingKey, message: msg, data: content });
  }

  if (routingKey === "DONOR_UPDATED" || routingKey === "DONOR_CREATED" || routingKey === "DONOR_DELETED") {
    if (content.hospitalId) {
      safeSocketEmit(`user_${content.hospitalId}`, "emergency_alert", {
        message: `Blood Stock Alert: ${content.bloodGroup} inventory is now ${content.count} units.`,
        data: content,
      });
    }
  }
};
