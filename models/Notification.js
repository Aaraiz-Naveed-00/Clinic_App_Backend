import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['announcement', 'blog', 'other'],
    default: 'other'
  },
  // Related content
  blogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog'
  }, // for type='blog' notifications
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }, // for per-user notifications (future)
  // Admin who created it
  createdBy: {
    type: String,
    required: true
  },
  // Read status (can be per-user in future)
  isRead: {
    type: Boolean,
    default: false
  },
  // Targeting
  targetAudience: {
    type: String,
    enum: ['all', 'patients', 'staff'],
    default: 'all'
  },
  // Scheduling
  scheduledFor: {
    type: Date
  }, // future: scheduled notifications
  expiresAt: {
    type: Date
  }, // auto-hide after this date
  isActive: {
    type: Boolean,
    default: true
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

notificationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for efficient queries
notificationSchema.index({ isActive: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ targetAudience: 1, isActive: 1 });

export default mongoose.model("Notification", notificationSchema);
