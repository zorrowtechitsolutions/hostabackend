import { admin } from "../config/firebase-admin";
import dotenv from "dotenv";
dotenv.config();

interface SendNotificationParams {
  token: string;
  title: string;
  body: string;
  imageUrl?: string;
}

export const sendPushNotification = async ({
  token,
  title,
  body,
  imageUrl=process.env.PUSHNOTIFICATION_IMAGE_URL,
}: SendNotificationParams) => {
  try {
    const message: admin.messaging.Message = {
      token,

      notification: {
        title,
        body,
      },

      android: {
        notification: {
          sound: 'default',
          icon: 'ic_notification',
          channelId: 'default-channel',
          imageUrl: imageUrl,
        },
      },

      apns: {
        payload: {
          aps: {
            sound: 'default',
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

    const response = await admin.messaging().send(message);

    console.log('✅ Notification sent:', response);

    return response;
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    throw error;
  }
};