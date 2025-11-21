import { Expo } from "expo-server-sdk";
import ExpoPushToken from "../models/ExpoPushToken.js";

const expo = new Expo();

export async function sendPushNotificationToAllAsync({ title, body, data }) {
  const tokens = await ExpoPushToken.find({});

  const messages = [];

  for (const item of tokens) {
    if (!Expo.isExpoPushToken(item.token)) {
      continue;
    }

    messages.push({
      to: item.token,
      sound: "default",
      title,
      body,
      data: data || {}
    });
  }

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (error) {
      console.error("Error sending Expo push chunk", error);
    }
  }
}
