import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { encrypt, decrypt } from "../config/crypto.js";
import { logAction } from "../middleware/logger.js";

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
