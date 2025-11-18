import cloudinary from "../config/cloudinary.js";
import { logAction } from "../middleware/logger.js";
import axios from "axios";

// Remove.bg API integration (Node-safe)
const removeBackground = async (imageBuffer) => {
  try {
    const API_KEY = process.env.REMOVE_BG_API_KEY;
    
    if (!API_KEY) {
      console.warn("Remove.bg API key not found in environment variables");
      return null;
    }

    // Use base64 payload instead of browser FormData/Blob to avoid Node issues
    const response = await axios.post(
      "https://api.remove.bg/v1.0/removebg",
      {
        image_file_b64: imageBuffer.toString("base64"),
        size: "auto",
        format: "png",
      },
      {
        headers: {
          "X-Api-Key": API_KEY,
        },
        responseType: "arraybuffer",
      }
    );

    return Buffer.from(response.data);
  } catch (error) {
    console.error("Background removal error:", error.response?.data || error.message || error);
    return null;
  }
};

// Upload image with optional background removal
export const uploadImage = async (req, res) => {
  try {
    const { 
      folder = 'general', 
      width = 600, 
      height = 400, 
      crop = 'fill',
      removeBg = false 
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    let imageBuffer = req.file.buffer;

    // Remove background if requested
    if (removeBg === 'true' || removeBg === true) {
      const removedBgBuffer = await removeBackground(imageBuffer);
      if (removedBgBuffer) {
        imageBuffer = removedBgBuffer;
        console.log("Background removed successfully");
      } else {
        console.log("Background removal failed, using original image");
      }
    }

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const transformation = [
        { width: parseInt(width), height: parseInt(height), crop },
        { quality: "auto" }
      ];

      // Add additional transformations for background removed images
      if (removeBg === 'true' || removeBg === true) {
        transformation.push({ background: "white" }); // Add white background for PNGs
      }

      const options = {
        resource_type: "image",
        folder,
        transformation
      };

      // When background is removed we force PNG, otherwise keep original format
      if (removeBg === 'true' || removeBg === true) {
        options.format = 'png';
      }

      cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(imageBuffer);
    });

    res.json({
      success: true,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      backgroundRemoved: removeBg === 'true' || removeBg === true
    });
  } catch (error) {
    console.error("Image upload error:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
};

// Upload doctor photo with background removal
export const uploadDoctorPhoto = async (req, res) => {
  try {
    const { removeBg = true } = req.body; // Default to true for doctor photos

    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    let imageBuffer = req.file.buffer;

    // Remove background for doctor photos
    if (removeBg === 'true' || removeBg === true) {
      const removedBgBuffer = await removeBackground(imageBuffer);
      if (removedBgBuffer) {
        imageBuffer = removedBgBuffer;
        console.log("Background removed from doctor photo");
      } else {
        console.log("Background removal failed for doctor photo, using original");
      }
    }

    // Upload with doctor-specific settings
    const uploadResult = await new Promise((resolve, reject) => {
      const transformation = [
        { width: 400, height: 400, crop: "fill" },
        { quality: "auto" }
      ];

      // Add white background for PNGs with removed background
      if (removeBg === 'true' || removeBg === true) {
        transformation.push({ background: "white" });
      }

      const options = {
        resource_type: "image",
        folder: "doctors",
        transformation
      };

      if (removeBg === 'true' || removeBg === true) {
        options.format = 'png';
      }

      cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(imageBuffer);
    });

    res.json({
      success: true,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      backgroundRemoved: removeBg === 'true' || removeBg === true
    });
  } catch (error) {
    console.error("Doctor photo upload error:", error);
    res.status(500).json({ error: "Failed to upload doctor photo" });
  }
};

// Upload promo card image with cropping
export const uploadPromoImage = async (req, res) => {
  try {
    const { 
      removeBg = false, // Default to false for promo cards
      aspectRatio = '3:2' 
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    let imageBuffer = req.file.buffer;

    // Remove background if requested (rare for promo cards)
    if (removeBg === 'true' || removeBg === true) {
      const removedBgBuffer = await removeBackground(imageBuffer);
      if (removedBgBuffer) {
        imageBuffer = removedBgBuffer;
        console.log("Background removed from promo image");
      } else {
        console.log("Background removal failed for promo image, using original");
      }
    }

    // Calculate dimensions based on aspect ratio
    let width, height;
    switch (aspectRatio) {
      case '16:9':
        width = 800;
        height = 450;
        break;
      case '1:1':
        width = 600;
        height = 600;
        break;
      case '3:2':
      default:
        width = 600;
        height = 400;
        break;
    }

    // Upload with promo-specific settings
    const uploadResult = await new Promise((resolve, reject) => {
      const transformation = [
        { width, height, crop: "fill" },
        { quality: "auto" }
      ];

      const options = {
        resource_type: "image",
        folder: "home-promos",
        transformation
      };

      if (removeBg === 'true' || removeBg === true) {
        options.format = 'png';
      }

      cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(imageBuffer);
    });

    res.json({
      success: true,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      aspectRatio,
      backgroundRemoved: removeBg === 'true' || removeBg === true
    });
  } catch (error) {
    console.error("Promo image upload error:", error);
    res.status(500).json({ error: "Failed to upload promo image" });
  }
};

// Delete image from Cloudinary
export const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ error: "Public ID is required" });
    }

    const result = await cloudinary.uploader.destroy(publicId);

    res.json({
      success: true,
      message: "Image deleted successfully",
      result
    });
  } catch (error) {
    console.error("Image deletion error:", error);
    res.status(500).json({ error: "Failed to delete image" });
  }
};
