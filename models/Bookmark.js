import mongoose from "mongoose";

// Alternative approach: separate bookmarks collection
// (if you prefer this over embedded bookmarks in User model)
const bookmarkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  blogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure user can't bookmark the same blog twice
bookmarkSchema.index({ userId: 1, blogId: 1 }, { unique: true });

// Index for efficient queries
bookmarkSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Bookmark", bookmarkSchema);
