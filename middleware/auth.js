import jwt from "jsonwebtoken";
import admin from "../config/firebase.js";
import fetch from "node-fetch";
import { supabaseAdmin } from "../config/supabase.js";

const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
  : null;

const isAllowedAdminEmail = (email) => {
  if (!ADMIN_EMAILS || ADMIN_EMAILS.length === 0) return true;
  if (!email) return false;
  return ADMIN_EMAILS.includes(String(email).toLowerCase());
};

async function fetchSupabaseUser(token) {
  if (!token) {
    throw new Error("Missing token");
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    throw new Error("Invalid Supabase token");
  }

  const user = data.user;
  return {
    id: user.id,
    email: user.email,
    authSource: "supabase",
    ...user,
  };
}

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

export const authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    req.user = await fetchSupabaseUser(token);
    return next();
  } catch (error) {
    console.error("Supabase auth verification failed:", error.message);
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      await authenticate(req, res, () => {});
    }

    if (!req.user?.email || !isAllowedAdminEmail(req.user.email)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    return next();
  } catch (error) {
    console.error("Admin verification error:", error.message);
    return res.status(403).json({ error: "Admin access required" });
  }
};
