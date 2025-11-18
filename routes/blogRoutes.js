import express from "express";
import Blog from "../models/Blog.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { logAction } from "../middleware/logger.js";
import { noPromotionalWords } from "../middleware/contentValidator.js";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

// Get all published blogs (public - for mobile app)
router.get("/", async (req, res) => {
  try {
    const { category, author, limit = 10, page = 1 } = req.query;
    
    const filter = { isPublished: true };
    if (category) filter.category = category;
    if (author) filter.author = new RegExp(author, 'i');

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const blogs = await Blog.find(filter)
      .select('-content') // Exclude full content for list view
      .sort({ publishedAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Blog.countDocuments(filter);

    res.json({
      blogs,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: blogs.length,
        totalBlogs: total
      }
    });
  } catch (error) {
    console.error("Fetch blogs error:", error);
    res.status(500).json({ error: "Failed to fetch blogs" });
  }
});

// Get all blogs for admin (includes unpublished)
router.get("/admin", requireAdmin, async (req, res) => {
  try {
    const { category, author, published, limit = 10, page = 1 } = req.query;
    
    const filter = {};
    if (category) filter.category = category;
    if (author) filter.author = new RegExp(author, 'i');
    if (published !== undefined) filter.isPublished = published === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const blogs = await Blog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Blog.countDocuments(filter);

    res.json({
      blogs,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: blogs.length,
        totalBlogs: total
      }
    });
  } catch (error) {
    console.error("Fetch admin blogs error:", error);
    res.status(500).json({ error: "Failed to fetch blogs" });
  }
});

// Get single blog by ID
router.get("/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    // Only allow unpublished blogs for admin users
    if (!blog.isPublished && (!req.user || req.user.authSource !== 'supabase')) {
      return res.status(404).json({ error: "Blog not found" });
    }

    // Increment view count for published blogs
    if (blog.isPublished) {
      blog.views += 1;
      await blog.save();
    }

    res.json(blog);
  } catch (error) {
    console.error("Fetch blog error:", error);
    res.status(500).json({ error: "Failed to fetch blog" });
  }
});

// Create new blog (admin only)
router.post("/", requireAdmin, logAction("CREATE_BLOG"), upload.single("image"), noPromotionalWords, async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      author,
      category,
      tags,
      isPublished
    } = req.body;

    // Allow image URL coming from separate upload flow
    let imageUrl = req.body.imageUrl || "";
    
    // Upload image to Cloudinary if provided as file
    if (req.file) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: "image",
              folder: "blogs",
              transformation: [
                { width: 800, height: 400, crop: "fill" },
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

    const blog = await Blog.create({
      title,
      content,
      excerpt,
      imageUrl,
      author,
      authorName: author,
      authorId: req.user.id,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      isPublished: isPublished === 'true'
    });

    res.status(201).json({
      success: true,
      blog
    });
  } catch (error) {
    console.error("Create blog error:", error);
    res.status(500).json({ error: "Failed to create blog" });
  }
});

// Update blog (admin only)
router.put("/:id", requireAdmin, logAction("UPDATE_BLOG"), upload.single("image"), noPromotionalWords, async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      author,
      category,
      tags,
      isPublished
    } = req.body;

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    let imageUrl = blog.imageUrl;

    // Prefer explicit imageUrl when provided and no new file
    if (!req.file && req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    }

    // Upload new image if provided as file
    if (req.file) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: "image",
              folder: "blogs",
              transformation: [
                { width: 800, height: 400, crop: "fill" },
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

    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      {
        title,
        content,
        excerpt,
        imageUrl,
        author,
        authorName: author || blog.authorName,
        category,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : blog.tags,
        isPublished: isPublished === 'true',
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      success: true,
      blog: updatedBlog
    });
  } catch (error) {
    console.error("Update blog error:", error);
    res.status(500).json({ error: "Failed to update blog" });
  }
});

// Delete blog (admin only)
router.delete("/:id", requireAdmin, logAction("DELETE_BLOG"), async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    await Blog.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Blog deleted successfully"
    });
  } catch (error) {
    console.error("Delete blog error:", error);
    res.status(500).json({ error: "Failed to delete blog" });
  }
});

// Toggle blog publish status (admin only)
router.patch("/:id/toggle-publish", requireAdmin, logAction("TOGGLE_BLOG_PUBLISH"), async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    blog.isPublished = !blog.isPublished;
    blog.updatedAt = new Date();
    
    if (blog.isPublished && !blog.publishedAt) {
      blog.publishedAt = new Date();
    }
    
    await blog.save();

    res.json({
      success: true,
      blog,
      message: `Blog ${blog.isPublished ? 'published' : 'unpublished'} successfully`
    });
  } catch (error) {
    console.error("Toggle blog publish error:", error);
    res.status(500).json({ error: "Failed to toggle blog publish status" });
  }
});

// Like blog
router.post("/:id/like", authenticate, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog || !blog.isPublished) {
      return res.status(404).json({ error: "Blog not found" });
    }

    blog.likes += 1;
    await blog.save();

    res.json({
      success: true,
      likes: blog.likes
    });
  } catch (error) {
    console.error("Like blog error:", error);
    res.status(500).json({ error: "Failed to like blog" });
  }
});

export default router;
