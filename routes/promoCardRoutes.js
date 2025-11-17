import express from "express";
import PromoCard from "../models/PromoCard.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { logAction } from "../middleware/logger.js";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

// Get all active promo cards (public - for mobile app)
router.get("/", async (req, res) => {
  try {
    const promoCards = await PromoCard.find({ isActive: true })
      .populate('doctorId', 'name surname specialty photoUrl')
      .sort({ displayOrder: 1, createdAt: -1 });

    res.json(promoCards);
  } catch (error) {
    console.error("Fetch promo cards error:", error);
    res.status(500).json({ error: "Failed to fetch promo cards" });
  }
});

// Get all promo cards for admin (includes inactive)
router.get("/admin", requireAdmin, async (req, res) => {
  try {
    const { active, limit = 10, page = 1 } = req.query;
    
    const filter = {};
    if (active !== undefined) filter.isActive = active === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const promoCards = await PromoCard.find(filter)
      .populate('doctorId', 'name surname specialty photoUrl')
      .sort({ displayOrder: 1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await PromoCard.countDocuments(filter);

    res.json({
      promoCards,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: promoCards.length,
        totalPromoCards: total
      }
    });
  } catch (error) {
    console.error("Fetch admin promo cards error:", error);
    res.status(500).json({ error: "Failed to fetch promo cards" });
  }
});

// Get single promo card by ID
router.get("/:id", async (req, res) => {
  try {
    const promoCard = await PromoCard.findById(req.params.id)
      .populate('doctorId', 'name surname specialty photoUrl');
    
    if (!promoCard) {
      return res.status(404).json({ error: "Promo card not found" });
    }

    // Only allow inactive promo cards for admin users
    if (!promoCard.isActive && (!req.user || req.user.authSource !== 'supabase')) {
      return res.status(404).json({ error: "Promo card not found" });
    }

    res.json(promoCard);
  } catch (error) {
    console.error("Fetch promo card error:", error);
    res.status(500).json({ error: "Failed to fetch promo card" });
  }
});

// Create new promo card (admin only)
router.post("/", requireAdmin, logAction("CREATE_PROMO_CARD"), upload.single("image"), async (req, res) => {
  try {
    const {
      title,
      highlight,
      doctorId,
      displayOrder,
      isActive
    } = req.body;

    let imageUrl = "";
    
    // Upload image to Cloudinary if provided
    if (req.file) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: "image",
              folder: "promo-cards",
              transformation: [
                { width: 600, height: 400, crop: "fill" },
                { quality: "auto" }
              ]
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(req.file.buffer);
        });
        
        imageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res.status(400).json({ error: "Failed to upload image" });
      }
    }

    const promoCard = await PromoCard.create({
      title,
      highlight,
      imageUrl,
      doctorId: doctorId || null,
      displayOrder: parseInt(displayOrder) || 0,
      isActive: isActive !== undefined ? isActive === 'true' : true,
      createdBy: req.user.id
    });

    // Populate doctor info for response
    await promoCard.populate('doctorId', 'name surname specialty photoUrl');

    res.status(201).json({
      success: true,
      promoCard
    });
  } catch (error) {
    console.error("Create promo card error:", error);
    res.status(500).json({ error: "Failed to create promo card" });
  }
});

// Update promo card (admin only)
router.put("/:id", requireAdmin, logAction("UPDATE_PROMO_CARD"), upload.single("image"), async (req, res) => {
  try {
    const {
      title,
      highlight,
      doctorId,
      displayOrder,
      isActive
    } = req.body;

    const promoCard = await PromoCard.findById(req.params.id);
    if (!promoCard) {
      return res.status(404).json({ error: "Promo card not found" });
    }

    let imageUrl = promoCard.imageUrl;

    // Upload new image if provided
    if (req.file) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: "image",
              folder: "promo-cards",
              transformation: [
                { width: 600, height: 400, crop: "fill" },
                { quality: "auto" }
              ]
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(req.file.buffer);
        });
        
        imageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res.status(400).json({ error: "Failed to upload image" });
      }
    }

    const updatedPromoCard = await PromoCard.findByIdAndUpdate(
      req.params.id,
      {
        title,
        highlight,
        imageUrl,
        doctorId: doctorId || null,
        displayOrder: parseInt(displayOrder),
        isActive: isActive === 'true',
        updatedAt: new Date()
      },
      { new: true }
    ).populate('doctorId', 'name surname specialty photoUrl');

    res.json({
      success: true,
      promoCard: updatedPromoCard
    });
  } catch (error) {
    console.error("Update promo card error:", error);
    res.status(500).json({ error: "Failed to update promo card" });
  }
});

// Delete promo card (admin only)
router.delete("/:id", requireAdmin, logAction("DELETE_PROMO_CARD"), async (req, res) => {
  try {
    const promoCard = await PromoCard.findById(req.params.id);
    
    if (!promoCard) {
      return res.status(404).json({ error: "Promo card not found" });
    }

    await PromoCard.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Promo card deleted successfully"
    });
  } catch (error) {
    console.error("Delete promo card error:", error);
    res.status(500).json({ error: "Failed to delete promo card" });
  }
});

// Toggle promo card active status (admin only)
router.patch("/:id/toggle-status", requireAdmin, logAction("TOGGLE_PROMO_CARD_STATUS"), async (req, res) => {
  try {
    const promoCard = await PromoCard.findById(req.params.id);
    
    if (!promoCard) {
      return res.status(404).json({ error: "Promo card not found" });
    }

    promoCard.isActive = !promoCard.isActive;
    promoCard.updatedAt = new Date();
    await promoCard.save();

    await promoCard.populate('doctorId', 'name surname specialty photoUrl');

    res.json({
      success: true,
      promoCard,
      message: `Promo card ${promoCard.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error("Toggle promo card status error:", error);
    res.status(500).json({ error: "Failed to toggle promo card status" });
  }
});

// Reorder promo cards (admin only)
router.put("/reorder", requireAdmin, logAction("REORDER_PROMO_CARDS"), async (req, res) => {
  try {
    const { cardOrders } = req.body; // Array of { id, displayOrder }

    if (!Array.isArray(cardOrders)) {
      return res.status(400).json({ error: "cardOrders must be an array" });
    }

    // Update display orders
    const updatePromises = cardOrders.map(({ id, displayOrder }) =>
      PromoCard.findByIdAndUpdate(id, { displayOrder: parseInt(displayOrder) })
    );

    await Promise.all(updatePromises);

    // Return updated cards
    const updatedCards = await PromoCard.find({ isActive: true })
      .populate('doctorId', 'name surname specialty photoUrl')
      .sort({ displayOrder: 1, createdAt: -1 });

    res.json({
      success: true,
      promoCards: updatedCards,
      message: "Promo cards reordered successfully"
    });
  } catch (error) {
    console.error("Reorder promo cards error:", error);
    res.status(500).json({ error: "Failed to reorder promo cards" });
  }
});

export default router;
