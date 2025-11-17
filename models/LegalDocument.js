import mongoose from "mongoose";

const legalDocumentSchema = new mongoose.Schema({
  key: {
    type: String,
    enum: ['kvkk', 'privacy', 'terms'],
    required: true
  },
  version: {
    type: String,
    required: true,
    default: "1.0.0"
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  body: {
    type: String,
    required: true
  }, // full KVKK/privacy/terms text
  language: {
    type: String,
    enum: ['tr', 'en'],
    default: 'tr'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  publishedAt: {
    type: Date,
    default: Date.now
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

legalDocumentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure unique active document per key and language
legalDocumentSchema.index({ key: 1, language: 1, isActive: 1 }, { unique: true });

export default mongoose.model("LegalDocument", legalDocumentSchema);
