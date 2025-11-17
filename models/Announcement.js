import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  imageUrl: {
    type: String,
    default: ""
  },
  type: {
    type: String,
    enum: ["info", "warning", "success", "urgent"],
    default: "info"
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 5
  },
  targetAudience: {
    type: String,
    enum: ["all", "patients", "staff"],
    default: "all"
  },
  expiresAt: {
    type: Date
  },
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

announcementSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
announcementSchema.index({ isActive: 1, priority: -1, createdAt: -1 });

export default mongoose.model("Announcement", announcementSchema);
