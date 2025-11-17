import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  adminId: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  method: {
    type: String,
    required: true
  },
  endpoint: {
    type: String,
    required: true
  },
  ip: {
    type: String
  },
  userAgent: {
    type: String
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
logSchema.index({ adminId: 1, timestamp: -1 });
logSchema.index({ action: 1, timestamp: -1 });

export default mongoose.model("Log", logSchema);
