import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.AES_SECRET;

if (!SECRET_KEY) {
  throw new Error("AES_SECRET environment variable is required");
}

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
