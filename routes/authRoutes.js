import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requireKVKKConsent } from "../middleware/contentValidator.js";
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
} from "../controllers/authController.js";

const router = express.Router();

// Register new user (mobile app)
router.post("/register", requireKVKKConsent, register);

// Login user (mobile app)
router.post("/login", login);

// Get user profile
router.get("/profile", authenticate, getProfile);

// Update user profile
router.put("/profile", authenticate, updateProfile);

// Change password
router.put("/change-password", authenticate, changePassword);

export default router;
