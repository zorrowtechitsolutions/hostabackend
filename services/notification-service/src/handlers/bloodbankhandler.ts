import Notification from "../models/notification.model";
import { safeSocketEmit } from "../utils/socket.emitter";

export const handleBloodBankEvent = async (
  routingKey: string,
  content: any
) => {
  if (
    routingKey !== "STOCK_CREATED" &&
    routingKey !== "STOCK_UPDATED" &&
    routingKey !== "STOCK_DELETED"
  ) {
    return;
  }

  let msg = "";

  const hospitalText = content.hospitalName ? ` in ${content.hospitalName}` : ` (Hospital ID: ${content.hospitalId})`;

  if (routingKey === "STOCK_CREATED") {
    msg = `New blood stock added${hospitalText}: Blood Group ${content.bloodGroup}`;
  } else if (routingKey === "STOCK_UPDATED") {
    msg = `Blood stock updated${hospitalText}: Blood Group ${content.bloodGroup}`;
  } else if (routingKey === "STOCK_DELETED") {
    msg = `Blood stock deleted${hospitalText}: Blood Group ${content.bloodGroup}`;
  }

  // Save notification
  await Notification.create({
    superAdminIds: [1],
    hospitalIds: content.hospitalId ? [content.hospitalId] : [],
    message: msg,
  }).catch((err) =>
    console.error(`Failed to save ${routingKey} notification`, err)
  );

  // Super Admin notification
  safeSocketEmit("role_1", "blood_bank_events", {
    event: routingKey,
    message: msg,
    data: content,
  });

  // Hospital notification
  if (content.hospitalId) {
    safeSocketEmit(
      `hospital_${content.hospitalId}`,
      "blood_bank_events",
      {
        event: routingKey,
        message: `Blood Stock Alert: ${content.bloodGroup} inventory is now ${content.count} units.`,
        data: content,
      }
    );
  }
};