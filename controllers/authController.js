import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { encrypt, decrypt } from "../config/crypto.js";
import { logAction } from "../middleware/logger.js";
import cloudinary from "../config/cloudinary.js";

// Register new user (mobile)
export const register = async (req, res) => {
  try {
    const { name, email, phone, address, password, kvkkConsent } = req.body;

    if (!name || !email || !phone || !password || !kvkkConsent) {
      return res.status(400).json({ error: "All fields including KVKK consent are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: encrypt(email) });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with encrypted sensitive data
    const user = await User.create({
      fullName: name,
      name,
      email: encrypt(email),
      mobileNumber: encrypt(phone),
      phone: encrypt(phone),
      address: encrypt(address),
      password: hashedPassword,
      kvkkConsent: kvkkConsent === 'true',
      kvkkAcceptedAt: kvkkConsent === 'true' ? new Date() : null
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: email,
        mobileNumber: phone,
        kvkkConsent: user.kvkkConsent
      }
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
};

// User login (mobile)
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user by encrypted email
    const encryptedEmail = encrypt(email);
    const user = await User.findOne({ email: encryptedEmail });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: email,
        mobileNumber: decrypt(user.mobileNumber),
        kvkkConsent: user.kvkkConsent
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to login" });
  }
};

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -passwordHash");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Decrypt sensitive data for response
    const userData = {
      ...user.toObject(),
      email: decrypt(user.email),
      mobileNumber: decrypt(user.mobileNumber),
      phone: decrypt(user.phone),
      address: decrypt(user.address)
    };

    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { fullName, mobileNumber, address } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update fields with encryption for sensitive data
    if (fullName) user.fullName = fullName;
    if (mobileNumber) {
      user.mobileNumber = encrypt(mobileNumber);
      user.phone = encrypt(mobileNumber);
    }
    if (address) user.address = encrypt(address);

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: decrypt(user.email),
        mobileNumber: decrypt(user.mobileNumber),
        address: decrypt(user.address)
      }
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new passwords are required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    user.passwordHash = hashedNewPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
};

// Upload user avatar (mobile + admin)
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          folder: "avatars",
          transformation: [
            { width: 400, height: 400, crop: "fill" },
            { quality: "auto" }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    const imageUrl = uploadResult.secure_url;

    res.json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    console.error("Upload avatar error:", error);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
};

// Sync Firebase-authenticated user into local User collection for admin dashboard
export const syncFirebaseUser = async (req, res) => {
  try {
    const authSource = req.user?.authSource || "firebase";

    if (authSource !== "firebase") {
      return res.status(400).json({ error: "Sync is only supported for Firebase-authenticated users" });
    }

    const firebaseUid = req.user?.uid || req.user?.user_id || req.user?.sub;
    const email = req.user?.email;
    const displayName = req.user?.name || req.user?.fullName;
    const photoUrl = req.user?.picture || req.user?.photoURL;

    if (!email || !firebaseUid) {
      return res.status(400).json({ error: "Missing email or Firebase UID from token" });
    }

    const fullName = displayName || email.split("@")[0] || "User";
    const encryptedEmail = encrypt(email);

    let user = await User.findOne({ email: encryptedEmail });

    if (!user) {
      const placeholderPassword = await bcrypt.hash(firebaseUid, 10);
      const encryptedEmpty = encrypt("");

      user = await User.create({
        fullName,
        name: fullName,
        email: encryptedEmail,
        mobileNumber: encryptedEmpty,
        phone: encryptedEmpty,
        address: encryptedEmpty,
        password: placeholderPassword,
        passwordHash: placeholderPassword,
        authProvider: "google",
        googleId: firebaseUid,
        avatarUrl: photoUrl || "",
        kvkkConsent: true,
        kvkkAccepted: true,
        kvkkAcceptedAt: new Date(),
        lastLogin: new Date(),
      });
    } else {
      let updated = false;

      if (!user.googleId) {
        user.googleId = firebaseUid;
        updated = true;
      }

      if (user.authProvider !== "google") {
        user.authProvider = "google";
        updated = true;
      }

      if (fullName && user.fullName !== fullName) {
        user.fullName = fullName;
        user.name = fullName;
        updated = true;
      }

      if (photoUrl && user.avatarUrl !== photoUrl) {
        user.avatarUrl = photoUrl;
        updated = true;
      }

      user.lastLogin = new Date();

      if (updated) {
        await user.save();
      } else {
        await user.save();
      }
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email,
        avatarUrl: user.avatarUrl,
        authProvider: user.authProvider,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("Sync Firebase user error:", error);
    res.status(500).json({ error: "Failed to sync Firebase user" });
  }
};
