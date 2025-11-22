import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requireKVKKConsent } from "../middleware/contentValidator.js";
import { upload } from "../middleware/upload.js";
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  syncFirebaseUser,
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

// Upload avatar (mobile + admin, uses Cloudinary)
router.post("/avatar", authenticate, upload.single("avatar"), uploadAvatar);

// Sync Firebase-authenticated user into local User collection (for admin visibility)
router.post("/sync-firebase-user", authenticate, syncFirebaseUser);

export default router;
