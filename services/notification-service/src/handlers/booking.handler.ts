import Notification from "../models/notification.model";
import { safeSocketEmit } from "../utils/socket.emitter";
import axios from "axios";
import { sendPushNotificationMulticast } from "../utils/sendPush";
import { getTokensIfEnabled } from "../utils/token.util";

const formatBookingId = (id: number | string): string => {
  const num = typeof id === "string" ? parseInt(id, 10) : id;
  if (isNaN(num)) return "#APT000000";
  return `#APT${String(num).padStart(6, "0")}`;
};

const persistNotification = async (payload: Record<string, any>, errorMessage: string) => {
  try {
    await Notification.create(payload);
  } catch (error) {
    console.error(errorMessage, error);
  }
};


const formatBookingDate = (dateStr?: string): string => {
  if (!dateStr) return "the requested date";
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return dateStr;
  return dateObj.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatConsultingTime = (time?: string): string => {
  if (!time) return "";
  const [hourStr, minuteStr] = time.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr || "00";
  if (isNaN(hour)) return time;
  const ampm = hour >= 12 ? "PM" : "AM";
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${ampm}`;
};

const capitalizeFirst = (str?: string): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const getFormattedDoctorName = (name?: string): string => {
  if (!name) return "Doctor";
  if (name.startsWith("Dr.")) return name;
  return `Dr. ${name}`;
};

export const handleBookingEvent = async (routingKey: string, content: any) => {
  const formattedId = formatBookingId(content.bookingNumber);
  const doctorName = getFormattedDoctorName(content.doctorName);
  const hospitalName = content.hospitalName || "the hospital";
  const patientName = content.patient_name || "Patient";
  const formattedDate = formatBookingDate(content.booking_date);

  // ==============================
  // BOOKING_REGISTERED / BOOKING_CANCELLED
  // ==============================
  if (routingKey === "BOOKING_REGISTERED" || routingKey === "BOOKING_CANCELLED") {
    const msgText = routingKey === "BOOKING_REGISTERED"
      ? `${patientName} has booked an appointment ${formattedId} with ${doctorName} at ${hospitalName} for ${formattedDate}`
      : `${patientName} has cancelled appointment ${formattedId} with ${doctorName} at ${hospitalName} for ${formattedDate}`;

    await persistNotification(
      {
        // userIds: content.userId ? [content.userId] : [],
        hospitalIds: content.hospitalId ? [content.hospitalId] : [],
        doctorIds: content.doctorId ? [content.doctorId] : [],
        message: msgText,
      },
      `Failed to save ${routingKey} notification`
    );

    if (content.userId) {
      safeSocketEmit(`user_${content.userId}`, "booking_event", { event: routingKey, message: msgText, data: content });
    }
    if (content.hospitalId) {
      safeSocketEmit(`hospital_${content.hospitalId}`, "booking_event", { event: routingKey, message: msgText, data: content });
    }
    if (content.doctorId) {
      safeSocketEmit(`doctor_${content.doctorId}`, "booking_event", { event: routingKey, message: msgText, data: content });
    }

    if (routingKey === "BOOKING_REGISTERED") {
      if (content.doctorId) {
        safeSocketEmit(`user_${content.doctorId}`, "booking_alert", {
          message: msgText,
          data: content,
        });
      }
      if (content.hospitalId) {
        safeSocketEmit(`user_${content.hospitalId}`, "booking_alert", {
          message: msgText,
          data: content,
        });
      }
    } else {
      if (content.doctorId) {
        safeSocketEmit(`user_${content.doctorId}`, "booking_alert", {
          message: msgText,
          data: content,
        });
      }
      if (content.hospitalId) {
        safeSocketEmit(`user_${content.hospitalId}`, "booking_alert", {
          message: msgText,
          data: content,
        });
      }
    }

    try {
      const tokensToNotify: string[] = [];
      let pushTitle = "";
      let pushBody = "";

      if (routingKey === "BOOKING_REGISTERED") {
        pushTitle = "New Booking";
        pushBody = `${content.patient_name || "Patient"} booked with ${doctorName}`;

        if (content.hospitalId) {
          const hTokens = await getTokensIfEnabled("hospital", content.hospitalId, "hospital_fcmtoken");
          tokensToNotify.push(...hTokens);
        }
        if (content.doctorId) {
          const dTokens = await getTokensIfEnabled("doctor", content.doctorId, "doctor_fcmtoken");
          tokensToNotify.push(...dTokens);
        }
      } else if (routingKey === "BOOKING_CANCELLED") {
        pushTitle = "Appointment Cancelled";
        pushBody = `Patient cancelled appointment at ${hospitalName}`;

        if (content.doctorId) {
          const dTokens = await getTokensIfEnabled("doctor", content.doctorId, "doctor_fcmtoken");
          tokensToNotify.push(...dTokens);
        }
        if (content.hospitalId) {
          const hTokens = await getTokensIfEnabled("hospital", content.hospitalId, "hospital_fcmtoken");
          tokensToNotify.push(...hTokens);
        }
      }

      if (tokensToNotify.length > 0) {
        await sendPushNotificationMulticast({
          tokens: tokensToNotify,
          title: pushTitle,
          body: pushBody,
        });
      }
    } catch (err: any) {
      console.error(`Failed to send ${routingKey} push notification`, err.message);
    }
  }

  // ==============================
  // BOOKING_DELETED
  // ==============================
  if (routingKey === "BOOKING_DELETED") {
    const msg = `Appointment ${formattedId} has been deleted`;

    await persistNotification(
      {
        userIds: content.userId ? [content.userId] : [],
        hospitalIds: content.hospitalId ? [content.hospitalId] : [],
        message: msg,
      },
      "Failed to save BOOKING_DELETED notification"
    );

    const recipients = [
      content.userId ? `user_${content.userId}` : null,
      content.hospitalId ? `hospital_${content.hospitalId}` : null,
      content.doctorId ? `doctor_${content.doctorId}` : null,
    ].filter(Boolean) as string[];

    for (const room of new Set(recipients)) {
      safeSocketEmit(room, "booking_event", {
        event: routingKey,
        message: msg,
        data: content,
      });
    }
  }

  // ==============================
  // BOOKING_UPDATED / BOOKING_ACCEPTED / BOOKING_COMPLETED
  // ==============================
  if (routingKey === "BOOKING_UPDATED" || routingKey === "BOOKING_ACCEPTED" || routingKey === "BOOKING_COMPLETED") {
    if (content.statusChanged !== false || content.bookingChanged === true) {
      let msg = "";
      if (!content.statusChanged && content.bookingChanged === true) {
        // Field-only update (no status change)
        const updated = content.updatedData || {};
        const details: string[] = [];

        if (updated.doctor_name) details.push(`Doctor: ${updated.doctor_name}`);
        if (updated.doctor_department) details.push(`Department: ${capitalizeFirst(updated.doctor_department)}`);
        if (updated.consulting_time) details.push(`Consulting Time: ${formatConsultingTime(updated.consulting_time)}`);
        if (updated.patient_phone) details.push(`Phone: ${updated.patient_phone}`);
        if (updated.booking_date) details.push(`Date: ${formatBookingDate(updated.booking_date)}`);

        msg = `The appointment details for ${patientName} have been updated.`;
        if (details.length > 0) {
          msg += `\n\n${details.join("\n")}`;
        }
      } else if (content.status === "accepted") {
        const accepter = content.actionBy === "doctor" ? "the doctor" : "the hospital";
        const tokenStr = content.newToken || "N/A";
        msg = `Your booking (${formattedId}) with ${doctorName} at ${hospitalName} has been accepted by ${accepter}. Your token number is #${tokenStr}. Please arrive at the hospital before your appointment time.`;
      } else if (content.status === "declined") {
        const decliner = content.actionBy === "doctor" ? "the doctor" : "the hospital";
        msg = `Booking (${formattedId}) with ${doctorName} at ${hospitalName} has been declined by ${decliner}`;
        if (content.reason) {
          msg += `. Reason: ${content.reason}`;
        }
      } else if (content.status === "cancel" || content.status === "cancelled") {
        msg = `Booking (${formattedId}) with ${doctorName} at ${hospitalName} has been cancelled`;
      } else if (content.status === "completed") {
        const completer = content.actionBy === "doctor" ? "the doctor" : "the hospital";
        msg = `Your booking (${formattedId}) with ${doctorName} at ${hospitalName} has been marked as completed by ${completer}`;
      } else {
        msg = `Your booking (${formattedId}) with ${doctorName} at ${hospitalName} has been updated to ${content.status || "updated"}`;
      }

      // Save for the user
      await persistNotification(
        {
          userIds: content.userId ? [content.userId] : [],
          // hospitalIds: content.hospitalId ? [content.hospitalId] : [],
          message: msg,
        },
        "Failed to save booking update notification"
      );

      if (content.userId) {
        safeSocketEmit(`user_${content.userId}`, "booking_event", {
          event: routingKey,
          message: msg,
          data: content,
        });
      }

      if (content.hospitalId) {
        safeSocketEmit(`hospital_${content.hospitalId}`, "booking_event", {
          event: routingKey,
          message: msg,
          data: content,
        });

        safeSocketEmit(`hospital_${content.hospitalId}`, "booking_created", {
          message: msg,
          bookingId: content.bookingId,
          status: content.status,
        });
      }
      if (content.doctorId) {
        safeSocketEmit(`doctor_${content.doctorId}`, "booking_event", {
          event: routingKey,
          message: msg,
          data: content,
        });
      }

      try {
        const tokensToNotify: string[] = [];
        let pushTitle = "";
        let pushBody = "";

        if (content.userId) {
          const authUserToken = await axios.get(`${process.env.USER_SERVICE_URL}/internal/users/${content.userId}`);
          const uTokens = authUserToken?.data?.data?.fcmToken?.map((d: any) => d.fcmToken) ?? [];
          tokensToNotify.push(...uTokens);
        }

        if (routingKey === "BOOKING_ACCEPTED") {
          pushTitle = "Booking Confirmed";
          const tokenStr = content.newToken || "N/A";
          pushBody = `Appointment with ${doctorName} at ${hospitalName} confirmed. Your token number is #${tokenStr}.`;
        } else if (routingKey === "BOOKING_UPDATED") {
          if (content.status === "declined") {
            pushTitle = "Booking Rejected";
            pushBody = `Your booking with ${doctorName} at ${hospitalName} has been rejected`;
          } else if (!content.statusChanged && content.bookingChanged === true) {
            pushTitle = "Booking Updated";
            pushBody = `The appointment details for ${patientName} have been updated.`;
          } else {
            pushTitle = "Booking Updated";
            pushBody = msg;
          }
        } else if (routingKey === "BOOKING_COMPLETED") {
          pushTitle = "Booking Completed";
          pushBody = `Your booking with ${doctorName} at ${hospitalName} has been completed`;
        }

        if (tokensToNotify.length > 0) {
          await sendPushNotificationMulticast({
            tokens: tokensToNotify,
            title: pushTitle,
            body: pushBody,
          });
        }
      } catch (err: any) {
        console.error(`Failed to send ${routingKey} push notification`, err.message);
      }
    }
  }

  // ==============================
  // TOKEN_UPDATED
  // ==============================
  const isJustAccepted = content.statusChanged && content.status === "accepted";
  if (content.tokenChanged === true && !isJustAccepted) {
    const tokenMsg = `Your token number for appointment ${formattedId} with ${doctorName} at ${hospitalName} has been changed from Token #${content.oldToken ?? "N/A"} to Token #${content.newToken ?? "N/A"}. Please take note of your updated token number.`;

    await persistNotification(
      {
        userIds: content.userId ? [content.userId] : [],
        // hospitalIds: content.hospitalId ? [content.hospitalId] : [],
        message: tokenMsg,
      },
      "Failed to save TOKEN_UPDATED notification"
    );

    if (content.userId) {
      safeSocketEmit(`user_${content.userId}`, "booking_event", {
        event: routingKey,
        message: tokenMsg,
        data: content,
      });
    }
    if (content.hospitalId) {
      safeSocketEmit(`hospital_${content.hospitalId}`, "booking_event", {
        event: routingKey,
        message: tokenMsg,
        data: content,
      });
    }
    if (content.doctorId) {
      safeSocketEmit(`doctor_${content.doctorId}`, "booking_event", {
        event: routingKey,
        message: tokenMsg,
        data: content,
      });
    }

    try {
      if (content.userId) {
        const authUserToken = await axios.get(`${process.env.USER_SERVICE_URL}/internal/users/${content.userId}`);
        const uTokens = authUserToken?.data?.data?.fcmToken?.map((d: any) => d.fcmToken) ?? [];

        if (uTokens.length > 0) {
          await sendPushNotificationMulticast({
            tokens: uTokens,
            title: "Token Number Updated",
            body: `Your token for ${doctorName} at ${hospitalName} has changed from #${content.oldToken ?? "N/A"} to #${content.newToken ?? "N/A"}.`,
          });
        }
      }
    } catch (err: any) {
      console.error("Failed to send TOKEN_UPDATED push notification", err.message);
    }
  }

  // ==============================
  // BOOKING_LIMIT_REACHED
  // ==============================
  if (routingKey === "BOOKING_LIMIT_REACHED") {
    const limitMsg = content.message;

    await persistNotification(
      {
        userIds: content.userId ? [content.userId] : [],
        message: limitMsg,
      },
      "Failed to save BOOKING_LIMIT_REACHED notification"
    );

    if (content.userId) {
      safeSocketEmit(`user_${content.userId}`, "booking_event", {
        event: routingKey,
        message: limitMsg,
        data: content,
      });
    }

    try {
      if (content.userId) {
        const authUserToken = await axios.get(`${process.env.USER_SERVICE_URL}/internal/users/${content.userId}`);
        const uTokens = authUserToken?.data?.data?.fcmToken?.map((d: any) => d.fcmToken) ?? [];

        if (uTokens.length > 0) {
          await sendPushNotificationMulticast({
            tokens: uTokens,
            title: "Booking Limit Reached",
            body: limitMsg,
          });
        }
      }
    } catch (err: any) {
      console.error("Failed to send BOOKING_LIMIT_REACHED push notification", err.message);
    }
  }
};