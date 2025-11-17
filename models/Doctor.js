import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  surname: {
    type: String,
    trim: true
  },
  fullName: {
    type: String,
    trim: true
  }, // computed field for mobile convenience
  title: {
    type: String,
    trim: true
  },
  specialty: {
    type: String,
    required: true,
    trim: true
  },
  university: {
    type: String,
    trim: true
  },
  experience: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  imageUrl: {
    type: String,
    default: ""
  }, // renamed from photoUrl to match mobile
  photoUrl: {
    type: String,
    default: ""
  }, // keep for backward compatibility
  bio: {
    type: String,
    default: ""
  },
  description: {
    type: String,
    default: ""
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  }, // for mobile app rating display
  patients: {
    type: Number,
    default: 0
  }, // patient count for mobile display
  languages: [{
    type: String,
    trim: true
  }], // languages spoken
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic'
  }, // if multiple clinics
  isActive: {
    type: Boolean,
    default: true
  },
  availableHours: {
    monday: { start: String, end: String },
    tuesday: { start: String, end: String },
    wednesday: { start: String, end: String },
    thursday: { start: String, end: String },
    friday: { start: String, end: String },
    saturday: { start: String, end: String },
    sunday: { start: String, end: String }
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

doctorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Auto-generate fullName for mobile convenience
  if (this.name || this.surname || this.title) {
    const parts = [];
    if (this.title) parts.push(this.title);
    if (this.name) parts.push(this.name);
    if (this.surname) parts.push(this.surname);
    this.fullName = parts.join(' ');
  }
  
  // Sync imageUrl and photoUrl for compatibility
  if (this.imageUrl && !this.photoUrl) {
    this.photoUrl = this.imageUrl;
  } else if (this.photoUrl && !this.imageUrl) {
    this.imageUrl = this.photoUrl;
  }
  
  next();
});

export default mongoose.model("Doctor", doctorSchema);
