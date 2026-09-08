
import Notification from "../models/notification.model";
import { safeSocketEmit } from "../utils/socket.emitter";

export const handlePatientEvent = async (
  routingKey: string,
  content: any
) => {
  if (
    routingKey === "PATIENT_REGISTERED" ||
    routingKey === "PATIENT_UPDATED" ||
    routingKey === "PATIENT_DELETED" ||
    routingKey === "PATIENT_RECOVERED"
  ) {
    let msg = "";

    if (routingKey === "PATIENT_REGISTERED") {
      msg = `New patient profile created: ${content.patientName || "Patient"}`;
    } else if (routingKey === "PATIENT_UPDATED") {
      msg = `Patient profile updated: ${content.patientName || "Patient"}`;
    } else if (routingKey === "PATIENT_DELETED") {
      msg = `Patient profile deleted / moved to blacklist (ID: ${content.patientId})`;
    } else if (routingKey === "PATIENT_RECOVERED") {
      msg = `Patient profile recovered from blacklist (ID: ${content.patientId})`;
    }

    await Notification.create({
      userIds: content.userId ? [content.userId] : [],
      hospitalIds: content.hospitalId ? [content.hospitalId] : [],
      message: msg,
    }).catch((err) =>
      console.error(`Failed to save ${routingKey} notification`, err)
    );

    // Emit to user room
    if (content.userId) {
      safeSocketEmit(`user_${content.userId}`, "patient_event", {
        event: routingKey,
        message: msg,
        data: content,
      });
    }

    // Emit to hospital room
    if (content.hospitalId) {
      safeSocketEmit(`hospital_${content.hospitalId}`, "patient_event", {
        event: routingKey,
        message: msg,
        data: content,
      });
    }
  }
};