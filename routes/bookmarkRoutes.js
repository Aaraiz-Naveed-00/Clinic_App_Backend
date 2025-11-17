import express from "express";
import User from "../models/User.js";
import Blog from "../models/Blog.js";
import Bookmark from "../models/Bookmark.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Get user's bookmarks (mobile app)
router.get("/", authenticate, async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    
    // Using embedded bookmarks approach (from User model)
    const user = await User.findById(req.user.id)
      .populate({
        path: 'bookmarks',
        select: 'title summary authorName readTimeLabel imageUrl date slug',
        match: { isPublished: true }, // only show published blogs
        options: {
          limit: parseInt(limit),
          skip: (parseInt(page) - 1) * parseInt(limit),
          sort: { createdAt: -1 }
        }
      });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Transform to match mobile app format
    const bookmarks = user.bookmarks.map(blog => ({
      id: blog._id,
      title: blog.title,
      summary: blog.summary,
      author: blog.authorName,
      readTime: blog.readTimeLabel,
      imageUrl: blog.imageUrl,
      date: blog.date
    }));

    res.json({
      bookmarks,
      pagination: {
        current: parseInt(page),
        hasMore: bookmarks.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Fetch bookmarks error:", error);
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
});

// Alternative: Get bookmarks using separate Bookmark collection
router.get("/alt", authenticate, async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookmarks = await Bookmark.find({ userId: req.user.id })
      .populate({
        path: 'blogId',
        select: 'title summary authorName readTimeLabel imageUrl date slug',
        match: { isPublished: true }
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Filter out bookmarks where blog was deleted or unpublished
    const validBookmarks = bookmarks
      .filter(bookmark => bookmark.blogId)
      .map(bookmark => ({
        id: bookmark.blogId._id,
        title: bookmark.blogId.title,
        summary: bookmark.blogId.summary,
        author: bookmark.blogId.authorName,
        readTime: bookmark.blogId.readTimeLabel,
        imageUrl: bookmark.blogId.imageUrl,
        date: bookmark.blogId.date,
        bookmarkedAt: bookmark.createdAt
      }));

    const total = await Bookmark.countDocuments({ userId: req.user.id });

    res.json({
      bookmarks: validBookmarks,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: validBookmarks.length,
        totalBookmarks: total
      }
    });
  } catch (error) {
    console.error("Fetch bookmarks alt error:", error);
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
});

// Add bookmark (mobile app)
router.post("/:blogId", authenticate, async (req, res) => {
  try {
    const { blogId } = req.params;

    // Verify blog exists and is published
    const blog = await Blog.findById(blogId);
    if (!blog || !blog.isPublished) {
      return res.status(404).json({ error: "Blog not found" });
    }

    // Using embedded bookmarks approach
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already bookmarked
    if (user.bookmarks.includes(blogId)) {
      return res.status(400).json({ error: "Blog already bookmarked" });
    }

    // Add to bookmarks
    user.bookmarks.push(blogId);
    await user.save();

    res.json({
      success: true,
      message: "Blog bookmarked successfully"
    });
  } catch (error) {
    console.error("Add bookmark error:", error);
    res.status(500).json({ error: "Failed to add bookmark" });
  }
});

// Alternative: Add bookmark using separate collection
router.post("/alt/:blogId", authenticate, async (req, res) => {
  try {
    const { blogId } = req.params;

    // Verify blog exists and is published
    const blog = await Blog.findById(blogId);
    if (!blog || !blog.isPublished) {
      return res.status(404).json({ error: "Blog not found" });
    }

    // Create bookmark (will fail if already exists due to unique index)
    const bookmark = await Bookmark.create({
      userId: req.user.id,
      blogId
    });

    res.json({
      success: true,
      message: "Blog bookmarked successfully",
      bookmark
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Blog already bookmarked" });
    }
    console.error("Add bookmark alt error:", error);
    res.status(500).json({ error: "Failed to add bookmark" });
  }
});

// Remove bookmark (mobile app)
router.delete("/:blogId", authenticate, async (req, res) => {
  try {
    const { blogId } = req.params;

    // Using embedded bookmarks approach
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove from bookmarks
    user.bookmarks = user.bookmarks.filter(id => id.toString() !== blogId);
    await user.save();

    res.json({
      success: true,
      message: "Bookmark removed successfully"
    });
  } catch (error) {
    console.error("Remove bookmark error:", error);
    res.status(500).json({ error: "Failed to remove bookmark" });
  }
});

// Alternative: Remove bookmark using separate collection
router.delete("/alt/:blogId", authenticate, async (req, res) => {
  try {
    const { blogId } = req.params;

    const result = await Bookmark.findOneAndDelete({
      userId: req.user.id,
      blogId
    });

    if (!result) {
      return res.status(404).json({ error: "Bookmark not found" });
    }

    res.json({
      success: true,
      message: "Bookmark removed successfully"
    });
  } catch (error) {
    console.error("Remove bookmark alt error:", error);
    res.status(500).json({ error: "Failed to remove bookmark" });
  }
});

// Check if blog is bookmarked (mobile app)
router.get("/check/:blogId", authenticate, async (req, res) => {
  try {
    const { blogId } = req.params;

    // Using embedded bookmarks approach
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isBookmarked = user.bookmarks.includes(blogId);

    res.json({
      isBookmarked
    });
  } catch (error) {
    console.error("Check bookmark error:", error);
    res.status(500).json({ error: "Failed to check bookmark status" });
  }
});

export default router;
