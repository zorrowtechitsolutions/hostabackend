import Notification from "../models/notification.model";
import { safeSocketEmit } from "../utils/socket.emitter";

const formatPrescriptionId = (id: number | string): string => {
  const num = typeof id === "string" ? parseInt(id, 10) : id;
  if (isNaN(num)) return "#PRS00000";
  return `#PRS${String(num).padStart(5, "0")}`;
};

export const handlePrescriptionEvent = async (routingKey: string, content: any) => {
  if (routingKey === "PRESCRIPTION_CREATED" || routingKey === "PRESCRIPTION_UPDATED" || routingKey === "PRESCRIPTION_DELETED") {
    const doctorName = content.doctorName || "Doctor";
    const hospitalName = content.hospitalName || "the hospital";
    const formattedId = formatPrescriptionId(content.prescriptionId);

    let msg = "";
    if (routingKey === "PRESCRIPTION_CREATED") {
      msg = `A new prescription ${formattedId} has been added for your patient profile by ${doctorName} at ${hospitalName}.`;
    } else if (routingKey === "PRESCRIPTION_UPDATED") {
      msg = `Prescription ${formattedId} on your profile has been updated by ${doctorName} at ${hospitalName}.`;
    } else if (routingKey === "PRESCRIPTION_DELETED") {
      msg = `Prescription ${formattedId} on your profile has been blacklisted by ${hospitalName}.`;
    }

    const includeHospital = routingKey !== "PRESCRIPTION_CREATED";

    await Notification.create({
      userIds: content.userId ? [content.userId] : [],
      hospitalIds: (includeHospital && content.hospitalId) ? [content.hospitalId] : [],
      message: msg,
    }).catch((err) => console.error(`Failed to save ${routingKey} notification`, err));

    if (content.userId) {
      safeSocketEmit(`user_${content.userId}`, "prescription_event", { event: routingKey, message: msg, data: content });
    }
    if (includeHospital && content.hospitalId) {
      safeSocketEmit(`hospital_${content.hospitalId}`, "prescription_event", { event: routingKey, message: msg, data: content });
    }
  }
};
