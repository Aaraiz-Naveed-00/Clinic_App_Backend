import express from "express";
import Doctor from "../models/Doctor.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { logAction } from "../middleware/logger.js";
import cloudinary from "../config/cloudinary.js";
import {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  toggleDoctorStatus,
  getAllDoctorsAdmin
} from "../controllers/doctorController.js";

const router = express.Router();

// Get all active doctors (public)
router.get("/", getAllDoctors);

// Get doctor by ID
router.get("/:id", getDoctorById);

// Create new doctor (admin only)
router.post("/", requireAdmin, logAction("CREATE_DOCTOR"), upload.single("photo"), createDoctor);

// Update doctor (admin only)
router.put("/:id", requireAdmin, logAction("UPDATE_DOCTOR"), upload.single("photo"), updateDoctor);

// Delete doctor (admin only)
router.delete("/:id", requireAdmin, logAction("DELETE_DOCTOR"), deleteDoctor);

// Toggle doctor status (admin only)
router.patch("/:id/toggle-status", requireAdmin, logAction("TOGGLE_DOCTOR_STATUS"), toggleDoctorStatus);

// Get all doctors for admin (includes inactive)
router.get("/admin/all", requireAdmin, getAllDoctorsAdmin);

export default router;
