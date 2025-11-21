import express from "express";
import { Expo } from "expo-server-sdk";
import ExpoPushToken from "../models/ExpoPushToken.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { token, platform } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    if (!Expo.isExpoPushToken(token)) {
      return res.status(400).json({ error: "Invalid Expo push token" });
    }

    await ExpoPushToken.findOneAndUpdate(
      { token },
      {
        token,
        platform: platform || "unknown",
        lastSeenAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Register Expo push token error", error);
    res.status(500).json({ error: "Failed to register Expo push token" });
  }
});

export default router;
