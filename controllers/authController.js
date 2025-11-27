import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { encrypt, decrypt } from "../config/crypto.js";
import cloudinary from "../config/cloudinary.js";
import { supabaseAdmin } from "../config/supabase.js";

const JWT_EXPIRES_IN = "7d";

const normalizeEmail = (email = "") => String(email).trim().toLowerCase();
const boolFromValue = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
  }
  return Boolean(value);
};

const encryptNullable = (value) => encrypt(value || "");
const decryptNullable = (value) => {
  if (!value) return "";
  try {
    return decrypt(value);
  } catch (error) {
    console.error("Decrypt error", error);
    return "";
  }
};

const signJwt = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

const resolveUserFromRequest = async (req) => {
  if (!req?.user) return null;

  // Legacy JWT paths where ID is Mongo ObjectId
  if (req.user.mongoId && mongoose.Types.ObjectId.isValid(req.user.mongoId)) {
    return User.findById(req.user.mongoId).select("-password -passwordHash");
  }

  if (req.user.id && mongoose.Types.ObjectId.isValid(req.user.id)) {
    return User.findById(req.user.id).select("-password -passwordHash");
  }

  return null;
};

const serializeUserForResponse = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: decryptNullable(user.email),
  mobileNumber: decryptNullable(user.mobileNumber),
  phone: decryptNullable(user.phone),
  address: decryptNullable(user.address),
  kvkkConsent: user.kvkkConsent,
  avatarUrl: user.avatarUrl,
  authProvider: user.authProvider,
  lastLogin: user.lastLogin,
});

// Register new user (mobile)
export const register = async (req, res) => {
  try {
    const { name, email, phone, address = "", password, kvkkConsent } = req.body;

    if (!name || !email || !phone || !password || kvkkConsent === undefined) {
      return res
        .status(400)
        .json({ error: "All fields including KVKK consent are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const encryptedEmail = encryptNullable(normalizedEmail);

    const existingUser = await User.findOne({ email: encryptedEmail });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const encryptedPhone = encryptNullable(phone);
    const encryptedAddress = encryptNullable(address);
    const consent = boolFromValue(kvkkConsent);

    const user = await User.create({
      fullName: name,
      name,
      email: encryptedEmail,
      mobileNumber: encryptedPhone,
      phone: encryptedPhone,
      address: encryptedAddress,
      password: hashedPassword,
      passwordHash: hashedPassword,
      kvkkConsent: consent,
      kvkkAccepted: consent,
      kvkkAcceptedAt: consent ? new Date() : null,
      lastLogin: new Date(),
    });

    const token = signJwt({ userId: user._id, email: normalizedEmail });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: normalizedEmail,
        mobileNumber: phone,
        kvkkConsent: user.kvkkConsent,
      },
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

    const normalizedEmail = normalizeEmail(email);
    const encryptedEmail = encryptNullable(normalizedEmail);
    const user = await User.findOne({ email: encryptedEmail });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = signJwt({ userId: user._id, email: normalizedEmail });

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: normalizedEmail,
        mobileNumber: decryptNullable(user.mobileNumber),
        kvkkConsent: user.kvkkConsent,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to login" });
  }
};

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const user = await resolveUserFromRequest(req);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      user: serializeUserForResponse(user),
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const user = await resolveUserFromRequest(req);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { fullName, mobileNumber, address } = req.body;

    if (fullName) {
      user.fullName = fullName;
      user.name = fullName;
    }

    if (mobileNumber) {
      const encryptedPhone = encryptNullable(mobileNumber);
      user.mobileNumber = encryptedPhone;
      user.phone = encryptedPhone;
    }

    if (address !== undefined) {
      user.address = encryptNullable(address);
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: serializeUserForResponse(user),
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
      return res
        .status(400)
        .json({ error: "Current and new passwords are required" });
    }

    const user = await resolveUserFromRequest(req);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    user.passwordHash = hashedNewPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
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
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "image",
            folder: "avatars",
            transformation: [
              { width: 400, height: 400, crop: "fill" },
              { quality: "auto" },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(req.file.buffer);
    });

    const imageUrl = uploadResult.secure_url;

    const user = await resolveUserFromRequest(req);
    if (user) {
      user.avatarUrl = imageUrl;
      await user.save();
    }

    res.json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    console.error("Upload avatar error:", error);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
};

async function upsertSupabaseAccount({
  supabaseId,
  email,
  metadata = {},
  appMetadata = {},
}) {
  const normalizedEmail = normalizeEmail(email);
  const encryptedEmail = encryptNullable(normalizedEmail);
  const fullName =
    metadata.full_name || metadata.name || normalizedEmail?.split("@")[0] || "Kullanıcı";
  const photoUrl = metadata.avatar_url || metadata.avatarURL || "";
  const provider = appMetadata.provider === "google" ? "google" : "password";
  const encryptedPhone = encryptNullable(metadata.phone || metadata.phone_number || "0000000000");
  const encryptedAddress = encryptNullable(metadata.address || "");

  let user = await User.findOne({ email: encryptedEmail });
  if (!user) {
    user = await User.findOne({ supabaseId });
  }

  const placeholderPassword = await bcrypt.hash(supabaseId, 10);

  if (!user) {
    user = await User.create({
      supabaseId,
      fullName,
      name: fullName,
      email: encryptedEmail,
      mobileNumber: encryptedPhone,
      phone: encryptedPhone,
      address: encryptedAddress,
      password: placeholderPassword,
      passwordHash: placeholderPassword,
      authProvider: provider,
      avatarUrl: photoUrl,
      kvkkConsent: true,
      kvkkAccepted: true,
      kvkkAcceptedAt: new Date(),
      lastLogin: new Date(),
    });
  } else {
    let updated = false;

    if (!user.supabaseId) {
      user.supabaseId = supabaseId;
      updated = true;
    }

    if (user.authProvider !== provider) {
      user.authProvider = provider;
      updated = true;
    }

    if (encryptedEmail && user.email !== encryptedEmail) {
      user.email = encryptedEmail;
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

    if (encryptedPhone && user.mobileNumber !== encryptedPhone) {
      user.mobileNumber = encryptedPhone;
      user.phone = encryptedPhone;
      updated = true;
    }

    if (encryptedAddress && user.address !== encryptedAddress) {
      user.address = encryptedAddress;
      updated = true;
    }

    user.lastLogin = new Date();

    if (updated) {
      await user.save();
    } else {
      await user.save();
    }
  }

  return user;
}

export const registerSupabaseAccount = async (req, res) => {
  try {
    const { email, password, fullName } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = normalizeEmail(email);

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || normalizedEmail?.split("@")[0] || "",
        name: fullName || "",
      },
    });

    if (error) {
      const message = error.message || "Failed to create Supabase user";
      return res.status(400).json({ error: message });
    }

    const supabaseUser = data?.user;

    if (!supabaseUser) {
      return res.status(500).json({ error: "Supabase user creation returned no user" });
    }

    const user = await upsertSupabaseAccount({
      supabaseId: supabaseUser.id,
      email: supabaseUser.email,
      metadata: supabaseUser.user_metadata ?? {},
      appMetadata: supabaseUser.app_metadata ?? {},
    });

    res.status(201).json({
      success: true,
      user: serializeUserForResponse(user),
    });
  } catch (error) {
    console.error("Register Supabase account error:", error);
    res.status(500).json({ error: "Failed to register Supabase user" });
  }
};

// Sync Supabase-authenticated user into local User collection
export const syncSupabaseUser = async (req, res) => {
  try {
    if (req.user?.authSource !== "supabase") {
      return res
        .status(400)
        .json({ error: "Sync is only supported for Supabase-authenticated users" });
    }

    const supabaseId = req.user?.id;
    const email = req.user?.email ? normalizeEmail(req.user.email) : null;

    if (!email || !supabaseId) {
      return res
        .status(400)
        .json({ error: "Missing email or Supabase user ID" });
    }

    const metadata = req.user?.user_metadata ?? {};
    const appMetadata = req.user?.app_metadata ?? {};

    const user = await upsertSupabaseAccount({
      supabaseId,
      email,
      metadata,
      appMetadata,
    });

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
    console.error("Sync Supabase user error:", error);
    res.status(500).json({ error: "Failed to sync Supabase user" });
  }
};
