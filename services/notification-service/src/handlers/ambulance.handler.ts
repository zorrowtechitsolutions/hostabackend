

import Notification from "../models/notification.model";
import { safeSocketEmit } from "../utils/socket.emitter";

export const handleAmbulanceEvent = async (routingKey: string, content: any) => {
  if (routingKey === "AMBULANCE_REGISTERED" || routingKey === "AMBULANCE_UPDATED" || routingKey === "AMBULANCE_DELETED") {
    const ambulanceName = content.ambulanceName || content.name || `ID: ${content.ambulanceId}`;
    let msg = "";
    if (routingKey === "AMBULANCE_REGISTERED") {
      const hospitalText = content.hospitalName ? ` with ${content.hospitalName}` : "";
      msg = `Ambulance Service Registered: The ambulance service ${ambulanceName} has been successfully registered${hospitalText}. Contact: ${content.phone || "N/A"}.`;
    } else if (routingKey === "AMBULANCE_UPDATED") {
      const hospitalText = content.hospitalName ? ` in ${content.hospitalName}` : "";
      msg = `Ambulance Service Updated: The profile of ${ambulanceName} has been successfully updated${hospitalText}.`;
    } else if (routingKey === "AMBULANCE_DELETED") {
      const hospitalText = content.hospitalName ? ` from ${content.hospitalName}` : "";
      msg = `Ambulance Service Removed: The ambulance service ${ambulanceName} has been successfully removed${hospitalText}.`;
    }

    await Notification.create({
      superAdminIds: [1],
      hospitalIds: content.hospitalId ? [content.hospitalId] : [],
      message: msg,
    }).catch((err) => console.error(`Failed to save ${routingKey} notification`, err));

    safeSocketEmit("role_1", "ambulance_events", { event: routingKey, message: msg, data: content });

    if (content.hospitalId) {
      safeSocketEmit(`hospital_${content.hospitalId}`, "ambulance_events", { event: routingKey, message: msg, data: content });
    }
  }
};