import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  }, // mobile uses 'fullName'
  name: {
    type: String,
    trim: true
  }, // admin compatibility
  email: {
    type: String,
    required: true,
    unique: true
  }, // encrypted
  mobileNumber: {
    type: String,
    required: true
  }, // mobile uses 'mobileNumber', encrypted
  phone: {
    type: String
  }, // admin compatibility, encrypted
  address: {
    type: String,
    default: ""
  }, // encrypted
  password: {
    type: String,
    required: true
  }, // hashed
  passwordHash: {
    type: String
  }, // alias for password
  role: {
    type: String,
    enum: ['patient', 'admin'],
    default: 'patient'
  },
  // Authentication providers
  authProvider: {
    type: String,
    enum: ['password', 'google'],
    default: 'password'
  },
  supabaseId: {
    type: String,
    sparse: true,
    unique: true,
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  avatarUrl: {
    type: String,
    default: ""
  },
  // KVKK compliance
  kvkkConsent: {
    type: Boolean,
    default: false,
    required: true
  },
  kvkkAccepted: {
    type: Boolean,
    default: false
  }, // alias for kvkkConsent
  kvkkAcceptedAt: {
    type: Date
  },
  kvkkVersion: {
    type: String,
    default: "1.0.0"
  }, // which KVKK text version they accepted
  // Bookmarks (embedded approach)
  bookmarks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog'
  }], // list of bookmarked blog IDs
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
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

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Sync mobile and admin field aliases
  if (this.fullName && !this.name) {
    this.name = this.fullName;
  } else if (this.name && !this.fullName) {
    this.fullName = this.name;
  }
  
  if (this.mobileNumber && !this.phone) {
    this.phone = this.mobileNumber;
  } else if (this.phone && !this.mobileNumber) {
    this.mobileNumber = this.phone;
  }
  
  if (this.password && !this.passwordHash) {
    this.passwordHash = this.password;
  } else if (this.passwordHash && !this.password) {
    this.password = this.passwordHash;
  }
  
  if (this.kvkkConsent !== this.kvkkAccepted) {
    this.kvkkAccepted = this.kvkkConsent;
  }
  
  // Set KVKK acceptance timestamp
  if (this.kvkkConsent && !this.kvkkAcceptedAt) {
    this.kvkkAcceptedAt = Date.now();
  }
  
  next();
});

export default mongoose.model("User", userSchema);
