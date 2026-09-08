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

const getFormattedDoctorName = (name?: string): string => {
  if (!name) return "Doctor";
  if (name.startsWith("Dr.")) return name;
  return `Dr. ${name}`;
};

export const handleBookingEvent = async (routingKey: string, content: any) => {
  const formattedId = formatBookingId(content.bookingId);
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
  // BOOKING_UPDATED / BOOKING_ACCEPTED / BOOKING_COMPLETED
  // ==============================
  if (routingKey === "BOOKING_UPDATED" || routingKey === "BOOKING_ACCEPTED" || routingKey === "BOOKING_COMPLETED") {
    if (content.statusChanged !== false) {
      let msg = "";
      if (content.status === "accepted") {
        const accepter = content.actionBy === "doctor" ? "the doctor" : "the hospital";
        msg = `Your booking (${formattedId}) with ${doctorName} at ${hospitalName} has been accepted by ${accepter}`;
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
          pushBody = `Appointment with ${doctorName} at ${hospitalName} confirmed`;
        } else if (routingKey === "BOOKING_UPDATED") {
          if (content.status === "declined") {
            pushTitle = "Booking Rejected";
            pushBody = `Your booking with ${doctorName} at ${hospitalName} has been rejected`;
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
  if (content.tokenChanged === true) {
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