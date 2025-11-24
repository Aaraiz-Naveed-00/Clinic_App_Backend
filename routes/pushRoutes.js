import express from "express";
import { Expo } from "expo-server-sdk";
import ExpoPushToken from "../models/ExpoPushToken.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

const validateTokenInput = (token) => {
  if (!token) {
    return "Token is required";
  }

  if (!Expo.isExpoPushToken(token)) {
    return "Invalid Expo push token";
  }

  return null;
};

const persistToken = async ({ token, platform, userId }) => {
  await ExpoPushToken.findOneAndUpdate(
    { token },
    {
      token,
      platform: platform || "unknown",
      lastSeenAt: new Date(),
      userId: userId || null,
    },
    { upsert: true, new: true }
  );
};

// Public endpoint so clients without auth (e.g. during onboarding) can store tokens.
router.post("/register", async (req, res) => {
  try {
    const { token, platform, userId } = req.body;
    const validationError = validateTokenInput(token);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    await persistToken({ token, platform, userId });

    res.json({ success: true });
  } catch (error) {
    console.error("Register Expo push token error", error);
    res.status(500).json({ error: "Failed to register Expo push token" });
  }
});

// Authenticated endpoint (preferred) automatically binds token to the caller's userId.
router.post("/register-auth", authenticate, async (req, res) => {
  try {
    const { token, platform } = req.body;
    const userId = req.user?.id;
    const validationError = validateTokenInput(token);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    await persistToken({ token, platform, userId });

    res.json({ success: true, userId });
  } catch (error) {
    console.error("Register authenticated push token error", error);
    res.status(500).json({ error: "Failed to register push token" });
  }
});

export default router;
