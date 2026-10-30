
import Notification from "../models/notification.model";
import { safeSocketEmit } from "../utils/socket.emitter";

export const handlePatientEvent = async (
  routingKey: string,
  content: any
) => {
  const patientName = content.patientName || "Patient";

  let title = "";
  let type = "";
  let msg = "";

  if (routingKey === "PATIENT_REGISTERED") {
    title = "New Patient Registered";
    type = "Info";
    msg = `New patient profile created: ${patientName} has been successfully registered.`;
  } else if (routingKey === "PATIENT_UPDATED") {
    title = "Patient Profile Updated";
    type = "Info";
    msg = `Patient profile updated: ${patientName}'s information has been modified.`;
  } else if (routingKey === "PATIENT_DELETED") {
    title = "Patient Profile Removed";
    type = "Important";
    msg = `Patient profile removed: ${patientName} (ID: ${content.patientId}) has been moved to blacklist.`;
  } else if (routingKey === "PATIENT_RECOVERED") {
    title = "Patient Profile Restored";
    type = "Info";
    msg = `Patient profile restored: ${patientName} (ID: ${content.patientId}) has been recovered from blacklist.`;
  } else {
    console.warn(`⚠️ Unhandled patient event: ${routingKey}`);
    return;
  }

  try {
    // Create Notification
    await Notification.create({
      userIds: content.userId ? [content.userId] : [],
      hospitalIds: content.hospitalId ? [content.hospitalId] : [],
      message: msg,
      metadata: {
        title,
        type,
        action: routingKey,
        patientName,
        patientId: content.patientId,
      },
    });

    // Build the payload once
    const payload = { event: routingKey, title, type, message: msg, data: content };

    // Emit to hospital room (same pattern as doctor/staff handlers)
    if (content.hospitalId) {
      const hospitalRoom = `hospital_${content.hospitalId}`;

      // patient_event — for frontend patient event listeners
      safeSocketEmit(hospitalRoom, "patient_event", payload);

      // hospital_event — for the general hospital notification feed
      safeSocketEmit(hospitalRoom, "hospital_event", payload);

      // emergency_alert — for real-time toast/alert UI
      safeSocketEmit(hospitalRoom, "emergency_alert", payload);
    }

    // Emit to user room
    if (content.userId) {
      safeSocketEmit(`user_${content.userId}`, "patient_event", payload);
    }
  } catch (error) {
    console.error(`Failed to process ${routingKey}`, error);
  }
};