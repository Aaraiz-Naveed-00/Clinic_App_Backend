import express from "express";
import Notification from "../models/Notification.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { logAction } from "../middleware/logger.js";
import { noPromotionalWords } from "../middleware/contentValidator.js";

const router = express.Router();

// Get all active notifications (public - for mobile app)
router.get("/", async (req, res) => {
  try {
    const { type, limit = 20 } = req.query;
    
    const filter = { 
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    };
    
    if (type) filter.type = type;

    const notifications = await Notification.find(filter)
      .populate('blogId', 'title imageUrl slug')
      .select('-createdBy')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(notifications);
  } catch (error) {
    console.error("Fetch notifications error:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Get all notifications for admin (includes inactive)
router.get("/admin", requireAdmin, async (req, res) => {
  try {
    const { type, active, limit = 20, page = 1 } = req.query;
    
    const filter = {};
    if (type) filter.type = type;
    if (active !== undefined) filter.isActive = active === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find(filter)
      .populate('blogId', 'title imageUrl slug')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Notification.countDocuments(filter);

    res.json({
      notifications,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: notifications.length,
        totalNotifications: total
      }
    });
  } catch (error) {
    console.error("Fetch admin notifications error:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Get single notification by ID
router.get("/:id", async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('blogId', 'title imageUrl slug content');
    
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json(notification);
  } catch (error) {
    console.error("Fetch notification error:", error);
    res.status(500).json({ error: "Failed to fetch notification" });
  }
});

// Create new notification (admin only)
router.post("/", requireAdmin, logAction("CREATE_NOTIFICATION"), noPromotionalWords, async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      blogId,
      userId,
      targetAudience,
      scheduledFor,
      expiresAt,
      isActive
    } = req.body;

    const notification = await Notification.create({
      title,
      message,
      type: type || 'other',
      blogId: blogId || null,
      userId: userId || null,
      targetAudience: targetAudience || 'all',
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: isActive !== undefined ? isActive === 'true' : true,
      createdBy: req.user.id
    });

    // Populate blog info for response
    await notification.populate('blogId', 'title imageUrl slug');

    res.status(201).json({
      success: true,
      notification
    });
  } catch (error) {
    console.error("Create notification error:", error);
    res.status(500).json({ error: "Failed to create notification" });
  }
});

// Update notification (admin only)
router.put("/:id", requireAdmin, logAction("UPDATE_NOTIFICATION"), noPromotionalWords, async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      blogId,
      userId,
      targetAudience,
      scheduledFor,
      expiresAt,
      isActive
    } = req.body;

    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    const updatedNotification = await Notification.findByIdAndUpdate(
      req.params.id,
      {
        title,
        message,
        type,
        blogId: blogId || null,
        userId: userId || null,
        targetAudience,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive === 'true',
        updatedAt: new Date()
      },
      { new: true }
    ).populate('blogId', 'title imageUrl slug');

    res.json({
      success: true,
      notification: updatedNotification
    });
  } catch (error) {
    console.error("Update notification error:", error);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

// Delete notification (admin only)
router.delete("/:id", requireAdmin, logAction("DELETE_NOTIFICATION"), async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Notification deleted successfully"
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

// Mark notification as read (user action)
router.patch("/:id/read", authenticate, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // For now, just mark as read globally
    // In future, you could implement per-user read status
    notification.isRead = true;
    notification.updatedAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: "Notification marked as read"
    });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// Create blog notification automatically (internal use)
router.post("/blog-published", requireAdmin, async (req, res) => {
  try {
    const { blogId, blogTitle } = req.body;

    const notification = await Notification.create({
      title: "New Article Published",
      message: `Check out our latest article: ${blogTitle}`,
      type: 'blog',
      blogId,
      targetAudience: 'all',
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      notification
    });
  } catch (error) {
    console.error("Create blog notification error:", error);
    res.status(500).json({ error: "Failed to create blog notification" });
  }
});

export default router;
