import express from "express";
import Blog from "../models/Blog.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { logAction } from "../middleware/logger.js";
import { noPromotionalWords } from "../middleware/contentValidator.js";
import cloudinary from "../config/cloudinary.js";
import Notification from "../models/Notification.js";
import { sendPushNotificationToAllAsync } from "../services/expoPushService.js";

const router = express.Router();
const DEFAULT_BLOG_IMAGE = "https://placehold.co/1200x630/E3F2FD/111111?text=Clinic+Blog";

const escapeHtml = (input = "") =>
  String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const stripHtml = (input = "") => String(input).replace(/<[^>]+>/g, "");

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

// SEO/share friendly blog preview (public)
router.get("/share/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    const isMongoId = /^[a-f\d]{24}$/i.test(identifier);
    const query = isMongoId
      ? { _id: identifier, isPublished: true }
      : { slug: identifier, isPublished: true };

    const blog = await Blog.findOne(query).lean();

    if (!blog) {
      return res
        .status(404)
        .set("Content-Type", "text/html; charset=utf-8")
        .send(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><title>Blog not found</title></head><body style="font-family: Arial, sans-serif; text-align: center; padding: 40px;">Blog not found.</body></html>`);
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const shareIdentifier = blog.slug || blog._id?.toString?.();
    const shareUrl = `${baseUrl}/api/blogs/share/${shareIdentifier}`;
    const deepLink = `clinicapp://blog/${blog._id?.toString?.()}`;
    const plainDescription = stripHtml(blog.summary || blog.excerpt || blog.content || "").trim();
    const description = plainDescription.slice(0, 220);
    const imageUrl = blog.imageUrl || DEFAULT_BLOG_IMAGE;

    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(blog.title || "Clinic Blog")}</title>
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(blog.title || "Clinic Blog")}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:url" content="${escapeHtml(shareUrl)}" />
    <meta property="article:author" content="${escapeHtml(blog.author || blog.authorName || "Clinic")}" />
    <meta property="article:published_time" content="${blog.publishedAt || blog.createdAt || ""}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(blog.title || "Clinic Blog")}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
    <meta http-equiv="refresh" content="0; url=${escapeHtml(deepLink)}" />
    <style>
      body { font-family: Arial, sans-serif; background: #f7f8fb; color: #111; margin: 0; padding: 32px; display: flex; min-height: 100vh; align-items: center; justify-content: center; }
      .card { max-width: 640px; width: 100%; background: #fff; padding: 32px; border-radius: 16px; box-shadow: 0 15px 50px rgba(0,0,0,0.08); }
      img { width: 100%; height: auto; border-radius: 12px; margin-bottom: 20px; }
      h1 { font-size: 24px; margin: 0 0 16px; }
      p { line-height: 1.6; margin-bottom: 16px; }
      a { color: #0a84ff; text-decoration: none; font-weight: 600; }
      .btn { display: inline-block; margin-top: 16px; padding: 12px 20px; background: #0097D9; color: #fff; border-radius: 999px; }
    </style>
  </head>
  <body>
    <article class="card">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(blog.title || "Clinic Blog")}" />
      <h1>${escapeHtml(blog.title || "Clinic Blog")}</h1>
      <p>${escapeHtml(description || "Tap below to read this article inside the Clinic App.")}</p>
      <p><strong>Having trouble?</strong> <a href="${escapeHtml(deepLink)}">Open directly in the Clinic App</a>.</p>
      <a class="btn" href="${escapeHtml(shareUrl)}?plain=1">View lightweight version</a>
    </article>
    <script>
      setTimeout(function(){ window.location.href = "${deepLink}"; }, 300);
    </script>
  </body>
</html>`;

    return res.set("Content-Type", "text/html; charset=utf-8").send(html);
  } catch (error) {
    console.error("Blog share page error:", error);
    return res
      .status(500)
      .set("Content-Type", "text/html; charset=utf-8")
      .send(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><title>Unable to load article</title></head><body style="font-family: Arial, sans-serif; text-align: center; padding: 40px;">Unable to load article preview.</body></html>`);
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

    const wasPreviouslyPublished = blog.isPublished;

    blog.isPublished = !blog.isPublished;
    blog.updatedAt = new Date();
    
    if (blog.isPublished && !blog.publishedAt) {
      blog.publishedAt = new Date();
    }
    
    await blog.save();

    if (blog.isPublished && !wasPreviouslyPublished) {
      try {
        const notification = await Notification.create({
          title: "New Article Published",
          message: `Check out our latest article: ${blog.title}`,
          type: 'blog',
          blogId: blog._id,
          targetAudience: 'all',
          createdBy: req.user.id,
        });

        await sendPushNotificationToAllAsync({
          title: "New Article Published",
          body: `Check out our latest article: ${blog.title}`,
          data: {
            type: 'blog',
            blogId: blog._id?.toString?.(),
            notificationId: notification._id?.toString?.(),
          },
        });
      } catch (notifyError) {
        console.error("Failed to send blog publish notification", notifyError);
      }
    }

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
