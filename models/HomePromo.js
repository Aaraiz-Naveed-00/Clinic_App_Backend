import mongoose from "mongoose";

// Separate collection for home screen promo cards (different from admin promo cards)
const homePromoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  highlight: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    default: ""
  }, // mobile field name
  imageUrl: {
    type: String,
    default: ""
  }, // admin compatibility
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }, // display order on home screen
  // Click behavior
  targetType: {
    type: String,
    enum: ['blog', 'doctor', 'external', 'none'],
    default: 'none'
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId
  }, // blogId or doctorId
  targetUrl: {
    type: String
  }, // for external links
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

homePromoSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Sync image fields
  if (this.image && !this.imageUrl) {
    this.imageUrl = this.image;
  } else if (this.imageUrl && !this.image) {
    this.image = this.imageUrl;
  }
  
  next();
});

// Index for efficient queries
homePromoSchema.index({ isActive: 1, order: 1 });

export default mongoose.model("HomePromo", homePromoSchema);
