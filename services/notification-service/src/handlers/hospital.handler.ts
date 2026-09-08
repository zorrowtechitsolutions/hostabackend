import Notification from "../models/notification.model";
import { safeSocketEmit } from "../utils/socket.emitter";
import { transporter } from "./email.handler";

export const handleHospitalEvent = async (routingKey: string, content: any) => {
  if (routingKey === "HOSPITAL_REGISTERED") {
    const msg = `New hospital registered: "${content.hospitalName || "Unknown"}" (ID: ${content.hospitalId})`;
    await Notification.create({
      superAdminIds: [1],
      message: msg,
    }).catch((err) => console.error("Failed to save HOSPITAL_REGISTERED notification", err));

    safeSocketEmit("role_1", "hospital_event", { event: routingKey, message: msg, data: content });
  }

  if (routingKey === "HOSPITAL_UPDATED") {
    const superMsg = `Hospital updated: "${content.hospitalName || "Unknown"}" (ID: ${content.hospitalId})`;
    const staffDoctorMsg = `Your hospital "${content.hospitalName || "Hospital"}" profile has been updated.`;

    // Save one notification record targeting superadmin, staff, and doctors
    await Notification.create({
      superAdminIds: [1],
      staffIds: Array.isArray(content.staffIds) && content.staffIds.length > 0 ? content.staffIds : [],
      doctorIds: Array.isArray(content.doctorIds) && content.doctorIds.length > 0 ? content.doctorIds : [],
      message: superMsg,
    }).catch((err) => console.error("Failed to save HOSPITAL_UPDATED notification", err));

    // Socket: superadmin
    safeSocketEmit("role_1", "hospital_event", { event: routingKey, message: superMsg, data: content });

    // Socket: each staff member
    if (Array.isArray(content.staffIds)) {
      content.staffIds.forEach((sid: number) => {
        safeSocketEmit(`user_${sid}`, "hospital_event", { event: routingKey, message: staffDoctorMsg, data: content });
      });
    }

    // Socket: each doctor
    if (Array.isArray(content.doctorIds)) {
      content.doctorIds.forEach((did: number) => {
        safeSocketEmit(`user_${did}`, "hospital_event", { event: routingKey, message: staffDoctorMsg, data: content });
      });
    }
  }

  if (
    routingKey === "HOSPITAL_DELETED" ||
    routingKey === "HOSPITAL_BLACKLISTED" ||
    routingKey === "HOSPITAL_RECOVERED"
  ) {
    const hospitalName = content.hospitalName || "Hospital";
    const hospitalEmail = content.email;

    let msg = "";
    let emailSubject = "";
    let emailMessage = "";

    if (routingKey === "HOSPITAL_BLACKLISTED") {
      msg = `Hospital Blacklisted — ${hospitalName} has been moved to the blacklist and is currently restricted from platform access.`;

      emailSubject = "Hospital Account Blacklisted";

      emailMessage = `Dear ${hospitalName} Administration,

Your hospital account has been moved to the blacklist by the platform administrator.

As a result, access to the platform is currently restricted.

If you believe this action was taken in error or require further information, please contact the platform administration.

Regards,
Platform Administration`;
    } else if (routingKey === "HOSPITAL_RECOVERED") {
      msg = `Hospital Restored — ${hospitalName} has been successfully restored from the blacklist.`;

      emailSubject = "Hospital Account Restored";

      emailMessage = `Dear ${hospitalName} Administration,

Your hospital account has been successfully restored from the blacklist by the platform administrator.

You may now access the platform and continue using the available services.

If you require any further assistance, please contact the platform administration.

Regards,
Platform Administration`;
    } else {
      msg = `Hospital Permanently Deleted — ${hospitalName} has been permanently removed from the platform.`;

      emailSubject = "Hospital Account Permanently Deleted";

      emailMessage = `Dear ${hospitalName} Administration,

Your hospital account has been permanently removed from the platform by the platform administrator.

You will no longer be able to access the platform using this hospital account.

If you require further information, please contact the platform administration.

Regards,
Platform Administration`;
    }

    // Save notification for SuperAdmin
    await Notification.create({
      superAdminIds: [1],
      message: msg,
    }).catch((err) => console.error(`Failed to save ${routingKey} notification`, err));

    // Real-time notification to SuperAdmin
    safeSocketEmit("role_1", "hospital_event", {
      event: routingKey,
      message: msg,
      data: content,
    });

    // Email notification to Hospital
    if (hospitalEmail) {
      transporter
        .sendMail({
          from: process.env.SMTP_USER,
          to: hospitalEmail,
          subject: emailSubject,
          text: emailMessage,
        })
        .catch((err) =>
          console.error(`Failed to send ${routingKey} hospital email`, err)
        );
    }
  }
};
