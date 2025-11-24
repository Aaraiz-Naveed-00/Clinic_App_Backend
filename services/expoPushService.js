import { Expo } from "expo-server-sdk";
import ExpoPushToken from "../models/ExpoPushToken.js";

const expo = new Expo();
const APP_SCHEME = process.env.APP_SCHEME || "clinicapp";

function buildDeepLink({ type, resourceId }) {
  if (!resourceId) {
    return `${APP_SCHEME}://notifications`;
  }

  switch (type) {
    case "blog":
      return `${APP_SCHEME}://blog/${resourceId}`;
    case "doctor":
      return `${APP_SCHEME}://doctor/${resourceId}`;
    case "announcement":
    default:
      return `${APP_SCHEME}://notifications`;
  }
}

export async function sendPushNotificationToAllAsync({ title, body, data, type, resourceId }) {
  const tokens = await ExpoPushToken.find({});

  console.log(`Preparing to send push notification to ${tokens.length} devices`);

  const messages = [];

  // Build notification data with deep linking
  const notificationData = {
    ...data,
    type: type || 'other',
    ...(type === 'blog' && resourceId && { blogId: resourceId }),
    ...(type === 'announcement' && resourceId && { announcementId: resourceId }),
    ...(type === 'doctor' && resourceId && { doctorId: resourceId }),
  };

  const deepLink = buildDeepLink({ type, resourceId });

  for (const item of tokens) {
    if (!Expo.isExpoPushToken(item.token)) {
      continue;
    }

    messages.push({
      to: item.token,
      sound: "default",
      title,
      body,
      data: {
        ...notificationData,
        deepLink,
      }
    });
  }

  const chunks = expo.chunkPushNotifications(messages);

  console.log(`Sending ${messages.length} Expo push messages in ${chunks.length} chunk(s)`);

  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      console.log("Expo push receipts:", JSON.stringify(receipts, null, 2));
    } catch (error) {
      console.error("Error sending Expo push chunk", error);
    }
  }
}
