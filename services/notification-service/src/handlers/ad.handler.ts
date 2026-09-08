import Notification from "../models/notification.model";
import { safeSocketEmit } from "../utils/socket.emitter";

export const handleAdEvent = async (routingKey: string, content: any) => {
  if (routingKey === "AD_CREATED" || routingKey === "AD_UPDATED" || routingKey === "AD_DELETED") {
    let msg = "";
    if (routingKey === "AD_CREATED") msg = "A new advertisement has been posted on the platform.";
    if (routingKey === "AD_UPDATED") msg = "An advertisement has been updated.";
    if (routingKey === "AD_DELETED") msg = "An advertisement has been removed.";

    await Notification.create({
      hospitalIds: content.hospitalId ? [content.hospitalId] : [],
      message: `Ad Alert: ${msg}`,
    }).catch((err) => console.error(`Failed to save ${routingKey} notification`, err));

    if (content.hospitalId) {
      safeSocketEmit(`hospital_${content.hospitalId}`, "hospital_event", {
        event: routingKey,
        message: msg,
        data: content,
      });
    } else {
      console.warn("AD event received without hospitalId; no hospital admin room emitted.");
    }
  }
};
