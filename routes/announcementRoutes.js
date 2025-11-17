import express from "express";
import Announcement from "../models/Announcement.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { logAction } from "../middleware/logger.js";
import { noPromotionalWords } from "../middleware/contentValidator.js";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

// Get all active announcements (public - for mobile app)
router.get("/", async (req, res) => {
  try {
    const { type, audience = "all" } = req.query;
    
    const filter = { 
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    };
    
    if (type) filter.type = type;
    if (audience !== "all") {
      filter.$or = [
        { targetAudience: "all" },
        { targetAudience: audience }
      ];
    }

    const announcements = await Announcement.find(filter)
      .select('-createdBy')
      .sort({ priority: -1, createdAt: -1 });

    res.json(announcements);
  } catch (error) {
    console.error("Fetch announcements error:", error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// Get all announcements for admin (includes inactive)
router.get("/admin", requireAdmin, async (req, res) => {
  try {
    const { type, active, limit = 10, page = 1 } = req.query;
    
    const filter = {};
    if (type) filter.type = type;
    if (active !== undefined) filter.isActive = active === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const announcements = await Announcement.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Announcement.countDocuments(filter);

    res.json({
      announcements,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: announcements.length,
        totalAnnouncements: total
      }
    });
  } catch (error) {
    console.error("Fetch admin announcements error:", error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// Get single announcement by ID
router.get("/:id", async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    // Only allow inactive announcements for admin users
    if (!announcement.isActive && (!req.user || req.user.authSource !== 'supabase')) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    res.json(announcement);
  } catch (error) {
    console.error("Fetch announcement error:", error);
    res.status(500).json({ error: "Failed to fetch announcement" });
  }
});

// Create new announcement (admin only)
router.post("/", requireAdmin, logAction("CREATE_ANNOUNCEMENT"), upload.single("image"), noPromotionalWords, async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      priority,
      targetAudience,
      expiresAt,
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
              folder: "announcements",
              transformation: [
                { width: 600, height: 300, crop: "fill" },
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

    const announcement = await Announcement.create({
      title,
      description,
      imageUrl,
      type: type || "info",
      priority: parseInt(priority) || 1,
      targetAudience: targetAudience || "all",
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: isActive !== undefined ? isActive === 'true' : true,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      announcement
    });
  } catch (error) {
    console.error("Create announcement error:", error);
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

// Update announcement (admin only)
router.put("/:id", requireAdmin, logAction("UPDATE_ANNOUNCEMENT"), upload.single("image"), noPromotionalWords, async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      priority,
      targetAudience,
      expiresAt,
      isActive
    } = req.body;

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    let imageUrl = announcement.imageUrl;

    // Upload new image if provided
    if (req.file) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: "image",
              folder: "announcements",
              transformation: [
                { width: 600, height: 300, crop: "fill" },
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

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        imageUrl,
        type,
        priority: parseInt(priority),
        targetAudience,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive === 'true',
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      success: true,
      announcement: updatedAnnouncement
    });
  } catch (error) {
    console.error("Update announcement error:", error);
    res.status(500).json({ error: "Failed to update announcement" });
  }
});

// Delete announcement (admin only)
router.delete("/:id", requireAdmin, logAction("DELETE_ANNOUNCEMENT"), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    await Announcement.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Announcement deleted successfully"
    });
  } catch (error) {
    console.error("Delete announcement error:", error);
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

// Toggle announcement active status (admin only)
router.patch("/:id/toggle-status", requireAdmin, logAction("TOGGLE_ANNOUNCEMENT_STATUS"), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    announcement.isActive = !announcement.isActive;
    announcement.updatedAt = new Date();
    await announcement.save();

    res.json({
      success: true,
      announcement,
      message: `Announcement ${announcement.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error("Toggle announcement status error:", error);
    res.status(500).json({ error: "Failed to toggle announcement status" });
  }
});

export default router;
