import mongoose from "mongoose";

const clinicInfoSchema = new mongoose.Schema({
  // Basic info
  name: {
    type: String,
    required: true,
    trim: true,
    default: "Dental Clinic"
  },
  address: {
    type: String,
    required: true,
    trim: true
  }, // used in openGoogleMaps
  city: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true,
    default: "Turkey"
  },
  
  // Contact info
  phonePrimary: {
    type: String,
    required: true
  }, // used for phone call & WhatsApp
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  whatsAppNumber: {
    type: String,
    required: true
  },
  websiteUrl: {
    type: String,
    trim: true
  },
  
  // Maps integration
  mapsPlaceQuery: {
    type: String,
    required: true,
    trim: true
  }, // business name or address for maps
  
  // About section
  aboutTitle: {
    type: String,
    default: "About Our Clinic"
  },
  aboutBody: {
    type: String,
    default: "We provide comprehensive dental care with modern technology and experienced professionals."
  },
  
  // Working hours
  workingHours: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true
    },
    open: {
      type: String,
      required: true
    }, // e.g. "09:00"
    close: {
      type: String,
      required: true
    }, // e.g. "18:00"
    isClosed: {
      type: Boolean,
      default: false
    }
  }],
  
  // Emergency contact
  emergencyPhone: {
    type: String
  },
  
  // Social media links
  socialLinks: [{
    type: {
      type: String,
      enum: ['instagram', 'facebook', 'x', 'tiktok', 'linkedin', 'youtube'],
      required: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    }
  }],
  
  // Additional settings
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

clinicInfoSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure only one clinic info document
clinicInfoSchema.index({ isActive: 1 }, { unique: true });

export default mongoose.model("ClinicInfo", clinicInfoSchema);
