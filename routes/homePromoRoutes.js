import express from "express";
import { requireAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { logAction } from "../middleware/logger.js";
import {
  getAllHomePromos,
  getAllHomePromosAdmin,
  getHomePromoById,
  createHomePromo,
  updateHomePromo,
  deleteHomePromo,
  reorderHomePromos
} from "../controllers/homePromoController.js";

const router = express.Router();

// Get all active home promos (public - for mobile app)
router.get("/", getAllHomePromos);

// Get all home promos for admin (includes inactive)
router.get("/admin", requireAdmin, getAllHomePromosAdmin);

// Get single home promo by ID
router.get("/:id", getHomePromoById);

// Create new home promo (admin only)
router.post("/", requireAdmin, logAction("CREATE_HOME_PROMO"), upload.single("image"), createHomePromo);

// Update home promo (admin only)
router.put("/:id", requireAdmin, logAction("UPDATE_HOME_PROMO"), upload.single("image"), updateHomePromo);

// Delete home promo (admin only)
router.delete("/:id", requireAdmin, logAction("DELETE_HOME_PROMO"), deleteHomePromo);

// Reorder home promos (admin only)
router.put("/reorder", requireAdmin, logAction("REORDER_HOME_PROMOS"), reorderHomePromos);

export default router;
