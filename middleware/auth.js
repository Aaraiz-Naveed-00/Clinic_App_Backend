import jwt from "jsonwebtoken";
import admin from "../config/firebase.js";
import fetch from "node-fetch";

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

// Admin-only middleware (requires Supabase auth)
export const requireAdmin = async (req, res, next) => {
  if (req.user?.authSource !== "supabase") {
    return res.status(403).json({ error: "Admin access required" });
  }
  
  // Additional admin role check can be added here
  // For now, any Supabase-authenticated user is considered admin
  next();
};
