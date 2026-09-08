import Notification from "../models/notification.model";
import { safeSocketEmit } from "../utils/socket.emitter";
import axios from "axios";
import { transporter } from "./email.handler";

const fetchAuthByRole = async (role: string, id: number) => {
  const authServiceUrl = process.env.AUTH_SERVICE_URL || "http://auth-service:3020";
  try {
    const resp = await axios.get(`${authServiceUrl}/auth/${id}/role/${role}`);
    return resp.data?.data || null;
  } catch (err) {
    console.error(`Failed to fetch auth for ${role} ${id}:`, err.response?.data || err.message);
    return null;
  }
};

const persistNotification = async (payload: Record<string, any>, errorMessage: string) => {
  try {
    await Notification.create(payload);
  } catch (error) {
    console.error(errorMessage, error);
  }
};

export const handleDoctorEvent = async (routingKey: string, content: any) => {
  // if (routingKey === "DOCTOR_REGISTERED") {
  //   await persistNotification(
  //     {
  //       hospitalIds: content.hospitalId ? [content.hospitalId] : [],
  //       message: `New Doctor registered: ${content.doctorName || "Doctor"}. Welcome to the platform!`,
  //     },
  //     "Failed to save consolidated doctor notification"
  //   );

  //   if (content.hospitalId) {
  //     const msg = `New Doctor registered: ${content.doctorName || "Doctor"}`;
  //     safeSocketEmit(`hospital_${content.hospitalId}`, "hospital_event", {
  //       event: routingKey,
  //       message: msg,
  //       data: content,
  //     });
  //     safeSocketEmit(`hospital_${content.hospitalId}`, "emergency_alert", {
  //       event: routingKey,
  //       message: msg,
  //       data: content,
  //     });
  //   }
  // }

  if (routingKey === "DOCTOR_REGISTERED") {
  const doctorName = content.doctorName || "Doctor";

  const msgText = `New Doctor Registered: ${content.doctorName} has been successfully registered with your hospital.`;

  // Save notification for the hospital
  await persistNotification(
    {
      hospitalIds: content.hospitalId ? [content.hospitalId] : [],
      message: msgText,
    },
    "Failed to save DOCTOR_REGISTERED notification"
  );

  // Send real-time notification to the hospital
  if (content.hospitalId) {
    const hospitalRoom = `hospital_${content.hospitalId}`;

    safeSocketEmit(hospitalRoom, "hospital_event", {
      event: routingKey,
      message: msgText,
      data: content,
    });

    safeSocketEmit(hospitalRoom, "emergency_alert", {
      event: routingKey,
      message: msgText,
      data: content,
    });
  }
}

  // if (routingKey === "DOCTOR_PASSWORD_RESET" || routingKey === "DOCTOR_PASSWORD_CHANGED") {
  //   let msgText = "";
  //   if (routingKey === "DOCTOR_PASSWORD_RESET") {
  //     msgText = `Security Alert: ${content.doctorName || "Doctor"} has successfully reset their password.${content.newPassword ? ` New password: ${content.newPassword}` : ""}`;
  //   } else {
  //     msgText = `Security Update: ${content.doctorName || "Doctor"} has changed their password.${content.newPassword ? ` New password: ${content.newPassword}` : ""}`;
  //   }

  //   await persistNotification(
  //     {
  //       hospitalIds: content.hospitalId ? [content.hospitalId] : [],
  //       message: msgText,
  //     },
  //     `Failed to save doctor ${routingKey.toLowerCase().replace("_", " ")} notification`
  //   );

  //   if (content.hospitalId) {
  //     const targetRoom = `hospital_${content.hospitalId}`;
  //     safeSocketEmit(targetRoom, "hospital_event", { event: routingKey, message: msgText, data: content });
  //     safeSocketEmit(targetRoom, "emergency_alert", { event: routingKey, message: msgText, data: content });
  //   }

  //   safeSocketEmit("role_1", "hospital_event", { event: routingKey, message: msgText, data: content });
  // }
  if (routingKey === "DOCTOR_PASSWORD_RESET") {
    // Ensure email is present; fetch from auth-service when missing
    if (!content.email && content.doctorId) {
      const auth = await fetchAuthByRole("doctor", content.doctorId);
      if (auth) content.email = auth.email;
    }

    const msgText = `Security Alert: ${content.doctorName || "Doctor"}${
      content.email ? ` (${content.email})` : ""
    } has successfully reset their password.${
      content.newPassword ? ` New password: ${content.newPassword}` : ""
    }`;


    await persistNotification(
      {
        hospitalIds: content.hospitalId ? [content.hospitalId] : [],
        message: msgText,
      },
      "Failed to save doctor password reset notification"
    );

    if (content.hospitalId) {
      const targetRoom = `hospital_${content.hospitalId}`;
      safeSocketEmit(targetRoom, "hospital_event", { event: routingKey, message: msgText, data: content });
      safeSocketEmit(targetRoom, "emergency_alert", { event: routingKey, message: msgText, data: content });
    }
  }

  if (routingKey === "DOCTOR_PASSWORD_CHANGED") {
    // Ensure hospitalName is present; fetch from auth-service when missing
    if (!content.hospitalName && content.doctorId) {
      const auth = await fetchAuthByRole("doctor", content.doctorId);
      if (auth) content.hospitalName = auth.hospitalName;
    }

    const msgText = `Security Update: Your password has been changed by the hospital admin at ${
      content.hospitalName || "the hospital"
    }.${
      content.newPassword ? ` Your new password: ${content.newPassword}` : ""
    }`;


    await persistNotification(
      {
        doctorIds: content.doctorId ? [content.doctorId] : [],
        message: msgText,
      },
      "Failed to save doctor password changed notification"
    );

    if (content.doctorId) {
      const doctorRoom = `doctor_${content.doctorId}`;
      safeSocketEmit(doctorRoom, "doctor_event", { event: routingKey, message: msgText, data: content });
      safeSocketEmit(doctorRoom, "emergency_alert", { event: routingKey, message: msgText, data: content });
    }
  }


 
  

  if (routingKey === "DOCTOR_UPDATED") {
    const doctorName = content.doctorName || "Doctor";
    const hospitalName = content.hospitalName || "the hospital";

    // Doctor updated their own profile → Notify Hospital
    if (content.updatedByRole === "doctor") {
      const msgText = `${doctorName} has updated their profile information. Please review the changes if necessary.`;

      await persistNotification(
        {
          hospitalIds: content.hospitalId ? [content.hospitalId] : [],
          message: msgText,
        },
        "Failed to save doctor profile update notification for hospital"
      );

      if (content.hospitalId) {
        const hospitalRoom = `hospital_${content.hospitalId}`;
        safeSocketEmit(hospitalRoom, "hospital_event", {
          event: routingKey,
          message: msgText,
          data: content,
        });
        safeSocketEmit(hospitalRoom, "emergency_alert", {
          event: routingKey,
          message: msgText,
          data: content,
        });
      }

      // Also notify the doctor so their own UI updates in real-time
      if (content.doctorId) {
        const doctorRoom = `doctor_${content.doctorId}`;
        safeSocketEmit(doctorRoom, "doctor_event", {
          event: routingKey,
          message: "Profile updated successfully.",
          data: content,
        });
      }
    }

    // Hospital/Admin updated doctor's profile → Notify Doctor
    if (content.updatedByRole !== "doctor") {
      const msgText = `Your profile information has been updated by the hospital ${hospitalName} administrator. Please review your profile to ensure the information is accurate.`;

      await persistNotification(
        {
          doctorIds: content.doctorId ? [content.doctorId] : [],
          message: msgText,
        },
        "Failed to save doctor profile update notification for doctor"
      );

      if (content.doctorId) {
        const doctorRoom = `doctor_${content.doctorId}`;
        safeSocketEmit(doctorRoom, "doctor_event", {
          event: routingKey,
          message: msgText,
          data: content,
        });
      }

      // Also notify the hospital so their own UI updates in real-time
      if (content.hospitalId) {
        const hospitalRoom = `hospital_${content.hospitalId}`;
        safeSocketEmit(hospitalRoom, "hospital_event", {
          event: routingKey,
          message: `Doctor ${content.doctorName || "profile"} updated successfully.`,
          data: content,
        });
      }
    }
  }








  if (routingKey === "DOCTOR_PASSWORD_CHANGED_BY_ADMIN") {
    const doctorMsg = `Your password has been changed by the hospital admin.${content.newPassword ? ` Your new password: ${content.newPassword}` : ""}`;

    await persistNotification(
      {
        doctorIds: content.doctorId ? [content.doctorId] : [],
        message: doctorMsg,
      },
      "Failed to save DOCTOR_PASSWORD_CHANGED_BY_ADMIN notification"
    );

    if (content.doctorId) {
      const doctorRoom = `doctor_${content.doctorId}`;
      safeSocketEmit(doctorRoom, "doctor_event", { event: routingKey, message: doctorMsg, data: content });
      safeSocketEmit(doctorRoom, "emergency_alert", { event: routingKey, message: doctorMsg, data: content });
    }
  }

  

  if (routingKey === "DOCTOR_DELETED") {
    const doctorName = content.doctorName || "Doctor";
    const hospitalName = content.hospitalName || "the hospital";

    // Hospital notification
    const msgText = `Doctor Profile Removed — ${doctorName}'s profile has been removed and moved to the blacklist.`;

    await persistNotification(
      {
        hospitalIds: content.hospitalId ? [content.hospitalId] : [],
        message: msgText,
      },
      "Failed to save DOCTOR_DELETED notification"
    );

    // Send notification to hospital
    if (content.hospitalId) {
      const hospitalRoom = `hospital_${content.hospitalId}`;

      safeSocketEmit(hospitalRoom, "hospital_event", {
        event: routingKey,
        message: msgText,
        data: content,
      });
    }

    // Email notification to the deleted doctor
    if (content.email) {
      const emailMessage = `Dear ${doctorName},

Your doctor profile has been removed and moved to the blacklist by the hospital administrator at ${hospitalName}.

Please contact ${hospitalName} administration for further information.

Regards,
${hospitalName} Administration`;

      transporter
        .sendMail({
          from: process.env.SMTP_USER,
          to: content.email,
          subject: "Doctor Profile Removed",
          text: emailMessage,
        })
        .catch((err) =>
          console.error("Failed to send DOCTOR_DELETED email", err)
        );
    }
  }

  if (routingKey === "DOCTOR_RECOVERED") {
    const doctorName = content.doctorName || "Doctor";
    const hospitalName = content.hospitalName || "the hospital";

    // Hospital notification
    const msgText = `Doctor Profile Restored — ${doctorName}'s profile has been successfully restored from the blacklist.`;

    await persistNotification(
      {
        hospitalIds: content.hospitalId ? [content.hospitalId] : [],
        message: msgText,
      },
      "Failed to save DOCTOR_RECOVERED notification"
    );

    // Send notification to hospital
    if (content.hospitalId) {
      const hospitalRoom = `hospital_${content.hospitalId}`;

      safeSocketEmit(hospitalRoom, "hospital_event", {
        event: routingKey,
        message: msgText,
        data: content,
      });
    }

    // Email notification to the recovered doctor
    if (content.email) {
      const emailMessage = `Dear ${doctorName},

Your doctor profile has been successfully restored from the blacklist by the hospital administrator at ${hospitalName}.

You may now access your profile and continue using the hospital's services as permitted.

If you have any questions, please contact ${hospitalName} administration.

Regards,
${hospitalName} Administration`;

      transporter
        .sendMail({
          from: process.env.SMTP_USER,
          to: content.email,
          subject: "Doctor Profile Restored",
          text: emailMessage,
        })
        .catch((err) =>
          console.error("Failed to send DOCTOR_RECOVERED email", err)
        );
    }
  }
};
