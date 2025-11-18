import jwt from "jsonwebtoken";
import admin from "../config/firebase.js";
import fetch from "node-fetch";

const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
  : null;

const isAllowedAdminEmail = (email) => {
  if (!ADMIN_EMAILS || ADMIN_EMAILS.length === 0) return true;
  if (!email) return false;
  return ADMIN_EMAILS.includes(String(email).toLowerCase());
};

// Verify Firebase ID token (for mobile app users)
export const verifyFirebaseToken = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      id: decodedToken.uid,
      email: decodedToken.email,
      authSource: "firebase",
      ...decodedToken
    };
    
    next();
  } catch (error) {
    console.error("Firebase token verification failed:", error);
    res.status(401).json({ error: "Invalid token" });
  }
};

// Verify Supabase JWT token (for admin panel)
export const verifySupabaseToken = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    // Verify with Supabase
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.SUPABASE_JWT_SECRET
      }
    });

    if (!response.ok) {
      throw new Error("Invalid Supabase token");
    }

    const userData = await response.json();
    req.user = {
      id: userData.id,
      email: userData.email,
      authSource: "supabase",
      ...userData
    };
    
    next();
  } catch (error) {
    console.error("Supabase token verification failed:", error);
    res.status(401).json({ error: "Invalid token" });
  }
};

// Universal auth middleware - tries both Firebase and Supabase
export const authenticate = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  // Try Firebase first
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      id: decodedToken.uid,
      email: decodedToken.email,
      authSource: "firebase",
      ...decodedToken
    };
    return next();
  } catch (firebaseError) {
    // If Firebase fails, try Supabase
    try {
      const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: process.env.SUPABASE_JWT_SECRET
        }
      });

      if (!response.ok) {
        throw new Error("Invalid Supabase token");
      }

      const userData = await response.json();
      req.user = {
        id: userData.id,
        email: userData.email,
        authSource: "supabase",
        ...userData
      };
      return next();
    } catch (supabaseError) {
      console.error("Both Firebase and Supabase token verification failed");
      return res.status(401).json({ error: "Invalid token" });
    }
  }
};

// Admin-only middleware (prefers existing Supabase auth, otherwise verifies Supabase JWT)
export const requireAdmin = async (req, res, next) => {
  // If a previous middleware already attached a Supabase user, allow
  if (req.user?.authSource === "supabase") {
    if (!isAllowedAdminEmail(req.user.email)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    return next();
  }

  // Otherwise, verify Supabase token directly from Authorization header
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.SUPABASE_JWT_SECRET,
      },
    });

    if (!response.ok) {
      console.error("Supabase admin verification failed with status:", response.status);
      return res.status(403).json({ error: "Admin access required" });
    }

    const userData = await response.json();
    req.user = {
      id: userData.id,
      email: userData.email,
      authSource: "supabase",
      ...userData,
    };

    if (!isAllowedAdminEmail(req.user.email)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    return next();
  } catch (error) {
    console.error("Supabase admin verification error:", error);
    return res.status(403).json({ error: "Admin access required" });
  }
};
