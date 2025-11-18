import CryptoJS from "crypto-js";
import dotenv from "dotenv";

dotenv.config();

// Prefer AES_SECRET from environment; fall back to a dev-only default key
const ENV_SECRET = process.env.AES_SECRET;

if (!ENV_SECRET) {
  console.warn(
    "AES_SECRET environment variable is not set. Using a default development key. Do NOT use this configuration in production."
  );
}

const SECRET_KEY = ENV_SECRET || "change-this-dev-secret-key-32-chars-min";

export const encrypt = (text) => {
  if (!text) return "";
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

export const decrypt = (cipher) => {
  if (!cipher) return "";
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Decryption error:", error);
    return "";
  }
};
