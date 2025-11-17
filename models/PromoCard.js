import mongoose from "mongoose";

const promoCardSchema = new mongoose.Schema({
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
  }, // mobile uses 'image'
  imageUrl: {
    type: String,
    default: ""
  }, // keep for admin compatibility
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }, // mobile uses 'order'
  displayOrder: {
    type: Number,
    default: 0
  }, // keep for admin compatibility
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  // Click behavior for mobile
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

promoCardSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Sync mobile and admin field aliases
  if (this.image && !this.imageUrl) {
    this.imageUrl = this.image;
  } else if (this.imageUrl && !this.image) {
    this.image = this.imageUrl;
  }
  
  if (this.order !== undefined && this.displayOrder !== this.order) {
    this.displayOrder = this.order;
  } else if (this.displayOrder !== undefined && this.order !== this.displayOrder) {
    this.order = this.displayOrder;
  }
  
  next();
});

// Index for efficient queries
promoCardSchema.index({ isActive: 1, displayOrder: 1 });

export default mongoose.model("PromoCard", promoCardSchema);
