import express from "express";
import ClinicInfo from "../models/ClinicInfo.js";
import { requireAdmin } from "../middleware/auth.js";
import { logAction } from "../middleware/logger.js";

const router = express.Router();

// Get clinic info (public - for mobile app)
router.get("/", async (req, res) => {
  try {
    const clinicInfo = await ClinicInfo.findOne({ isActive: true });
    
    if (!clinicInfo) {
      // Return default clinic info if none exists
      return res.json({
        name: "Dental Clinic",
        address: "Sample Address",
        city: "Istanbul",
        country: "Turkey",
        phonePrimary: "+90 555 000 0000",
        email: "info@dentalclinic.com",
        whatsAppNumber: "+90 555 000 0000",
        mapsPlaceQuery: "Dental Clinic Istanbul",
        aboutTitle: "About Our Clinic",
        aboutBody: "We provide comprehensive dental care with modern technology and experienced professionals.",
        workingHours: [
          { day: "monday", open: "09:00", close: "18:00", isClosed: false },
          { day: "tuesday", open: "09:00", close: "18:00", isClosed: false },
          { day: "wednesday", open: "09:00", close: "18:00", isClosed: false },
          { day: "thursday", open: "09:00", close: "18:00", isClosed: false },
          { day: "friday", open: "09:00", close: "18:00", isClosed: false },
          { day: "saturday", open: "09:00", close: "14:00", isClosed: false },
          { day: "sunday", open: "00:00", close: "00:00", isClosed: true }
        ],
        socialLinks: []
      });
    }

    res.json(clinicInfo);
  } catch (error) {
    console.error("Fetch clinic info error:", error);
    res.status(500).json({ error: "Failed to fetch clinic info" });
  }
});

// Get clinic info for admin
router.get("/admin", requireAdmin, async (req, res) => {
  try {
    const clinicInfo = await ClinicInfo.findOne({ isActive: true });
    
    if (!clinicInfo) {
      return res.status(404).json({ error: "Clinic info not found" });
    }

    res.json(clinicInfo);
  } catch (error) {
    console.error("Fetch admin clinic info error:", error);
    res.status(500).json({ error: "Failed to fetch clinic info" });
  }
});

// Create or update clinic info (admin only)
router.post("/", requireAdmin, logAction("UPDATE_CLINIC_INFO"), async (req, res) => {
  try {
    const {
      name,
      address,
      city,
      country,
      phonePrimary,
      email,
      whatsAppNumber,
      websiteUrl,
      mapsPlaceQuery,
      aboutTitle,
      aboutBody,
      workingHours,
      emergencyPhone,
      socialLinks
    } = req.body;

    // Check if clinic info already exists
    let clinicInfo = await ClinicInfo.findOne({ isActive: true });

    if (clinicInfo) {
      // Update existing
      clinicInfo = await ClinicInfo.findByIdAndUpdate(
        clinicInfo._id,
        {
          name,
          address,
          city,
          country,
          phonePrimary,
          email,
          whatsAppNumber,
          websiteUrl,
          mapsPlaceQuery,
          aboutTitle,
          aboutBody,
          workingHours: workingHours || clinicInfo.workingHours,
          emergencyPhone,
          socialLinks: socialLinks || clinicInfo.socialLinks,
          updatedAt: new Date()
        },
        { new: true }
      );
    } else {
      // Create new
      clinicInfo = await ClinicInfo.create({
        name,
        address,
        city,
        country,
        phonePrimary,
        email,
        whatsAppNumber,
        websiteUrl,
        mapsPlaceQuery,
        aboutTitle,
        aboutBody,
        workingHours: workingHours || [
          { day: "monday", open: "09:00", close: "18:00", isClosed: false },
          { day: "tuesday", open: "09:00", close: "18:00", isClosed: false },
          { day: "wednesday", open: "09:00", close: "18:00", isClosed: false },
          { day: "thursday", open: "09:00", close: "18:00", isClosed: false },
          { day: "friday", open: "09:00", close: "18:00", isClosed: false },
          { day: "saturday", open: "09:00", close: "14:00", isClosed: false },
          { day: "sunday", open: "00:00", close: "00:00", isClosed: true }
        ],
        emergencyPhone,
        socialLinks: socialLinks || []
      });
    }

    res.json({
      success: true,
      clinicInfo
    });
  } catch (error) {
    console.error("Update clinic info error:", error);
    res.status(500).json({ error: "Failed to update clinic info" });
  }
});

// Update working hours (admin only)
router.put("/working-hours", requireAdmin, logAction("UPDATE_WORKING_HOURS"), async (req, res) => {
  try {
    const { workingHours } = req.body;

    if (!Array.isArray(workingHours)) {
      return res.status(400).json({ error: "workingHours must be an array" });
    }

    const clinicInfo = await ClinicInfo.findOne({ isActive: true });
    if (!clinicInfo) {
      return res.status(404).json({ error: "Clinic info not found" });
    }

    clinicInfo.workingHours = workingHours;
    clinicInfo.updatedAt = new Date();
    await clinicInfo.save();

    res.json({
      success: true,
      workingHours: clinicInfo.workingHours,
      message: "Working hours updated successfully"
    });
  } catch (error) {
    console.error("Update working hours error:", error);
    res.status(500).json({ error: "Failed to update working hours" });
  }
});

// Update social links (admin only)
router.put("/social-links", requireAdmin, logAction("UPDATE_SOCIAL_LINKS"), async (req, res) => {
  try {
    const { socialLinks } = req.body;

    if (!Array.isArray(socialLinks)) {
      return res.status(400).json({ error: "socialLinks must be an array" });
    }

    const clinicInfo = await ClinicInfo.findOne({ isActive: true });
    if (!clinicInfo) {
      return res.status(404).json({ error: "Clinic info not found" });
    }

    clinicInfo.socialLinks = socialLinks;
    clinicInfo.updatedAt = new Date();
    await clinicInfo.save();

    res.json({
      success: true,
      socialLinks: clinicInfo.socialLinks,
      message: "Social links updated successfully"
    });
  } catch (error) {
    console.error("Update social links error:", error);
    res.status(500).json({ error: "Failed to update social links" });
  }
});

// Get contact info for mobile (simplified)
router.get("/contact", async (req, res) => {
  try {
    const clinicInfo = await ClinicInfo.findOne({ isActive: true });
    
    const contactInfo = {
      name: clinicInfo?.name || "Dental Clinic",
      address: clinicInfo?.address || "Sample Address",
      city: clinicInfo?.city || "Istanbul",
      phonePrimary: clinicInfo?.phonePrimary || "+90 555 000 0000",
      whatsAppNumber: clinicInfo?.whatsAppNumber || "+90 555 000 0000",
      email: clinicInfo?.email || "info@dentalclinic.com",
      mapsPlaceQuery: clinicInfo?.mapsPlaceQuery || "Dental Clinic Istanbul",
      emergencyPhone: clinicInfo?.emergencyPhone
    };

    res.json(contactInfo);
  } catch (error) {
    console.error("Fetch contact info error:", error);
    res.status(500).json({ error: "Failed to fetch contact info" });
  }
});

export default router;
