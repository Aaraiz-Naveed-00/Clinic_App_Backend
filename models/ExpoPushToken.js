import mongoose from "mongoose";

const expoPushTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  platform: {
    type: String,
    default: "unknown",
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastSeenAt: {
    type: Date,
    default: Date.now,
  },
});

expoPushTokenSchema.pre("save", function (next) {
  this.lastSeenAt = Date.now();
  next();
});

export default mongoose.model("ExpoPushToken", expoPushTokenSchema);
