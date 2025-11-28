import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import Blog from "../models/Blog.js";
import Announcement from "../models/Announcement.js";
import PromoCard from "../models/PromoCard.js";
import Appointment from "../models/Appointment.js";
import Log from "../models/Log.js";
import { requireAdmin } from "../middleware/auth.js";
import { logAction } from "../middleware/logger.js";
import { decrypt } from "../config/crypto.js";

const router = express.Router();

// Verify admin access & return profile snapshot
router.get("/me", requireAdmin, async (req, res) => {
  try {
    const mongoUser = await User.findOne({ supabaseId: req.user.id })
      .select("role fullName name email isActive createdAt updatedAt");

    res.json({
      success: true,
      supabaseUser: {
        id: req.user.id,
        email: req.user.email,
        user_metadata: req.user.user_metadata ?? {},
      },
      mongoUser,
    });
  } catch (error) {
    console.error("Admin profile fetch failed", error);
    res.status(500).json({ error: "Failed to load admin profile" });
  }
});

// Get dashboard statistics
router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalDoctors,
      activeDoctors,
      totalBlogs,
      publishedBlogs,
      totalAnnouncements,
      activeAnnouncements,
      totalPromoCards,
      activePromoCards,
      totalAppointments,
      todayAppointments,
      pendingAppointments
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Doctor.countDocuments(),
      Doctor.countDocuments({ isActive: true }),
      Blog.countDocuments(),
      Blog.countDocuments({ isPublished: true }),
      Announcement.countDocuments(),
      Announcement.countDocuments({ isActive: true }),
      PromoCard.countDocuments(),
      PromoCard.countDocuments({ isActive: true }),
      Appointment.countDocuments(),
      Appointment.countDocuments({
        appointmentDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }),
      Appointment.countDocuments({ status: 'scheduled' })
    ]);

    res.json({
      users: {
        total: totalUsers,
        active: totalUsers
      },
      doctors: {
        total: totalDoctors,
        active: activeDoctors,
        inactive: totalDoctors - activeDoctors
      },
      blogs: {
        total: totalBlogs,
        published: publishedBlogs,
        draft: totalBlogs - publishedBlogs
      },
      announcements: {
        total: totalAnnouncements,
        active: activeAnnouncements,
        inactive: totalAnnouncements - activeAnnouncements
      },
      promoCards: {
        total: totalPromoCards,
        active: activePromoCards,
        inactive: totalPromoCards - activePromoCards
      },
      appointments: {
        total: totalAppointments,
        today: todayAppointments,
        pending: pendingAppointments
      }
    });
  } catch (error) {
    console.error("Fetch admin stats error:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// Get recent activity logs
router.get("/logs", requireAdmin, async (req, res) => {
  try {
    const { limit = 50, page = 1, action, adminId } = req.query;
    
    const filter = {};
    if (action) filter.action = new RegExp(action, 'i');
    if (adminId) filter.adminId = adminId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await Log.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Log.countDocuments(filter);

    res.json({
      logs,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: logs.length,
        totalLogs: total
      }
    });
  } catch (error) {
    console.error("Fetch admin logs error:", error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// Get all users (admin view)
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const { active, limit = 20, page = 1, search } = req.query;
    
    const filter = {};
    if (active !== undefined) filter.isActive = active === 'true';
    if (search) {
      filter.name = new RegExp(search, 'i');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Decrypt user data for admin view
    const decryptedUsers = users.map(user => ({
      ...user.toObject(),
      email: decrypt(user.email),
      phone: decrypt(user.phone),
      address: decrypt(user.address),
      lastLoginAt: user.lastLogin,
    }));

    const total = await User.countDocuments(filter);

    res.json({
      users: decryptedUsers,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: users.length,
        totalUsers: total
      }
    });
  } catch (error) {
    console.error("Fetch admin users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get single user by ID (admin view)
router.get("/users/:id", requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const decryptedUser = {
      ...user.toObject(),
      email: decrypt(user.email),
      phone: decrypt(user.phone),
      address: decrypt(user.address),
      lastLoginAt: user.lastLogin,
    };

    res.json({ user: decryptedUser });
  } catch (error) {
    console.error("Fetch admin user by id error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Toggle user active status
router.patch("/users/:id/toggle-status", requireAdmin, logAction("TOGGLE_USER_STATUS"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.isActive = !user.isActive;
    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        email: decrypt(user.email),
        phone: decrypt(user.phone),
        address: decrypt(user.address)
      },
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error("Toggle user status error:", error);
    res.status(500).json({ error: "Failed to toggle user status" });
  }
});

// Update user role (admin only)
router.patch("/users/:id/role", requireAdmin, logAction("UPDATE_USER_ROLE"), async (req, res) => {
  try {
    const { role } = req.body;

    if (!role || !["patient", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role. Allowed roles are 'patient' and 'admin'." });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.role = role;
    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        email: decrypt(user.email),
        phone: decrypt(user.phone),
        address: decrypt(user.address),
        lastLoginAt: user.lastLogin,
      },
      message: "User role updated successfully"
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({ error: "Failed to update user role" });
  }
});

// Get system health check
router.get("/health", requireAdmin, async (req, res) => {
  try {
    let dbConnected = mongoose.connection.readyState === 1;

    if (!dbConnected && mongoose.connection.db) {
      try {
        await mongoose.connection.db.admin().command({ ping: 1 });
        dbConnected = true;
      } catch {
        dbConnected = false;
      }
    }
    
    res.json({
      status: 'healthy',
      timestamp: new Date(),
      database: dbConnected ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date(),
      error: error.message
    });
  }
});

// Export data (admin only)
router.get("/export/:type", requireAdmin, logAction("EXPORT_DATA"), async (req, res) => {
  try {
    const { type } = req.params;
    let data = [];

    switch (type) {
      case 'users':
        const users = await User.find().select('-password');
        data = users.map(user => ({
          ...user.toObject(),
          email: decrypt(user.email),
          phone: decrypt(user.phone),
          address: decrypt(user.address)
        }));
        break;
      
      case 'doctors':
        data = await Doctor.find();
        break;
      
      case 'blogs':
        data = await Blog.find();
        break;
      
      case 'appointments':
        const appointments = await Appointment.find()
          .populate('doctorId', 'name surname specialty');
        data = appointments.map(appointment => ({
          ...appointment.toObject(),
          patientPhone: decrypt(appointment.patientPhone),
          patientEmail: appointment.patientEmail ? decrypt(appointment.patientEmail) : null
        }));
        break;
      
      case 'logs':
        data = await Log.find().sort({ timestamp: -1 }).limit(1000);
        break;
      
      default:
        return res.status(400).json({ error: "Invalid export type" });
    }

    res.json({
      success: true,
      type,
      count: data.length,
      data,
      exportedAt: new Date()
    });
  } catch (error) {
    console.error("Export data error:", error);
    res.status(500).json({ error: "Failed to export data" });
  }
});

// Clear old logs (admin only)
router.delete("/logs/cleanup", requireAdmin, logAction("CLEANUP_LOGS"), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await Log.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Deleted logs older than ${days} days`
    });
  } catch (error) {
    console.error("Cleanup logs error:", error);
    res.status(500).json({ error: "Failed to cleanup logs" });
  }
});

export default router;
