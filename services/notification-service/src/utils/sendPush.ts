import { admin } from "../config/firebase-admin";
import dotenv from "dotenv";
dotenv.config();

interface SendNotificationMulticastParams {
  tokens: string[];
  title: string;
  body: string;
  imageUrl?: string;
}

export const sendPushNotificationMulticast = async ({
  tokens,
  title,
  body,
  imageUrl = process.env.PUSHNOTIFICATION_IMAGE_URL,
}: SendNotificationMulticastParams) => {
  if (!tokens || tokens.length === 0) {
    return null;
  }

  try {
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title,
        body,
      },
      android: {
        notification: {
          sound: "default",
          icon: "ic_notification",
          channelId: "default-channel",
          imageUrl: imageUrl,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
        fcmOptions: {
          imageUrl: imageUrl,
        },
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        imageUrl: imageUrl ?? "",
      },
      webpush: {
        notification: {
          title,
          body,
          icon: imageUrl ?? undefined,
        },
        fcmOptions: {
          link: "/", // Default link for web
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    console.log(`✅ Multicast Notification sent. Success: ${response.successCount}, Failed: ${response.failureCount}`);
    
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          console.error(`❌ Failed token: ${tokens[idx]}, error: ${resp.error}`);
        }
      });
      // Further logic (e.g. BullMQ retry or DB update to remove invalid tokens) could be added here
    }

    return response;
  } catch (error) {
    console.error("❌ Error sending multicast notification:", error);
    throw error;
  }
};
