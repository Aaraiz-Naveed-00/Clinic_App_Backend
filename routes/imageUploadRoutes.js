import express from "express";
import { requireAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { logAction } from "../middleware/logger.js";
import {
  uploadImage,
  uploadDoctorPhoto,
  uploadPromoImage,
  deleteImage
} from "../controllers/imageUploadController.js";

const router = express.Router();

// General image upload with background removal option
router.post("/upload", requireAdmin, logAction("UPLOAD_IMAGE"), upload.single("image"), uploadImage);

// Doctor photo upload with automatic background removal
router.post("/doctor-photo", requireAdmin, logAction("UPLOAD_DOCTOR_PHOTO"), upload.single("image"), uploadDoctorPhoto);

// Promo card image upload with cropping options
router.post("/promo-image", requireAdmin, logAction("UPLOAD_PROMO_IMAGE"), upload.single("image"), uploadPromoImage);

// Delete image from Cloudinary
router.delete("/delete", requireAdmin, logAction("DELETE_IMAGE"), deleteImage);

export default router;
