import HomePromo from "../models/HomePromo.js";
import cloudinary from "../config/cloudinary.js";
import { logAction } from "../middleware/logger.js";

// Get all active home promos (public - for mobile app)
export const getAllHomePromos = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const homePromos = await HomePromo.find({ isActive: true })
      .populate('targetId', 'title name fullName')
      .sort({ order: 1, createdAt: -1 })
      .limit(parseInt(limit));

    res.json(homePromos);
  } catch (error) {
    console.error("Fetch home promos error:", error);
    res.status(500).json({ error: "Failed to fetch home promos" });
  }
};

// Get all home promos for admin (includes inactive)
export const getAllHomePromosAdmin = async (req, res) => {
  try {
    const { active, limit = 10, page = 1 } = req.query;
    
    const filter = {};
    if (active !== undefined) filter.isActive = active === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const homePromos = await HomePromo.find(filter)
      .populate('targetId', 'title name fullName')
      .sort({ order: 1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await HomePromo.countDocuments(filter);

    res.json({
      homePromos,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: homePromos.length,
        totalHomePromos: total
      }
    });
  } catch (error) {
    console.error("Fetch admin home promos error:", error);
    res.status(500).json({ error: "Failed to fetch home promos" });
  }
};

// Get single home promo by ID
export const getHomePromoById = async (req, res) => {
  try {
    const homePromo = await HomePromo.findById(req.params.id)
      .populate('targetId', 'title name fullName');
    
    if (!homePromo) {
      return res.status(404).json({ error: "Home promo not found" });
    }

    res.json(homePromo);
  } catch (error) {
    console.error("Fetch home promo error:", error);
    res.status(500).json({ error: "Failed to fetch home promo" });
  }
};

// Create new home promo (admin only)
export const createHomePromo = async (req, res) => {
  try {
    const {
      title,
      highlight,
      order,
      targetType,
      targetId,
      targetUrl,
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
              folder: "home-promos",
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

    const homePromo = await HomePromo.create({
      title,
      highlight,
      image: imageUrl,
      imageUrl,
      order: parseInt(order) || 0,
      targetType: targetType || 'none',
      targetId: targetId || null,
      targetUrl: targetUrl || null,
      isActive: isActive !== undefined ? isActive === 'true' : true,
      createdBy: req.user.id
    });

    // Populate target info for response
    await homePromo.populate('targetId', 'title name fullName');

    res.status(201).json({
      success: true,
      homePromo
    });
  } catch (error) {
    console.error("Create home promo error:", error);
    res.status(500).json({ error: "Failed to create home promo" });
  }
};

// Update home promo (admin only)
export const updateHomePromo = async (req, res) => {
  try {
    const {
      title,
      highlight,
      order,
      targetType,
      targetId,
      targetUrl,
      isActive
    } = req.body;

    const homePromo = await HomePromo.findById(req.params.id);
    if (!homePromo) {
      return res.status(404).json({ error: "Home promo not found" });
    }

    let imageUrl = homePromo.image;

    // Upload new image if provided
    if (req.file) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: "image",
              folder: "home-promos",
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

    const updatedHomePromo = await HomePromo.findByIdAndUpdate(
      req.params.id,
      {
        title,
        highlight,
        image: imageUrl,
        imageUrl,
        order: parseInt(order),
        targetType,
        targetId: targetId || null,
        targetUrl: targetUrl || null,
        isActive: isActive === 'true',
        updatedAt: new Date()
      },
      { new: true }
    ).populate('targetId', 'title name fullName');

    res.json({
      success: true,
      homePromo: updatedHomePromo
    });
  } catch (error) {
    console.error("Update home promo error:", error);
    res.status(500).json({ error: "Failed to update home promo" });
  }
};

// Delete home promo (admin only)
export const deleteHomePromo = async (req, res) => {
  try {
    const homePromo = await HomePromo.findById(req.params.id);
    
    if (!homePromo) {
      return res.status(404).json({ error: "Home promo not found" });
    }

    await HomePromo.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Home promo deleted successfully"
    });
  } catch (error) {
    console.error("Delete home promo error:", error);
    res.status(500).json({ error: "Failed to delete home promo" });
  }
};

// Reorder home promos (admin only)
export const reorderHomePromos = async (req, res) => {
  try {
    const { promoOrders } = req.body; // Array of { id, order }

    if (!Array.isArray(promoOrders)) {
      return res.status(400).json({ error: "promoOrders must be an array" });
    }

    // Update orders
    const updatePromises = promoOrders.map(({ id, order }) =>
      HomePromo.findByIdAndUpdate(id, { order: parseInt(order) })
    );

    await Promise.all(updatePromises);

    // Return updated promos
    const updatedPromos = await HomePromo.find({ isActive: true })
      .populate('targetId', 'title name fullName')
      .sort({ order: 1, createdAt: -1 });

    res.json({
      success: true,
      homePromos: updatedPromos,
      message: "Home promos reordered successfully"
    });
  } catch (error) {
    console.error("Reorder home promos error:", error);
    res.status(500).json({ error: "Failed to reorder home promos" });
  }
};
