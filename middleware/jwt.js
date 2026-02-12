import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { encrypt } from "./crypto.js";
import { loggingWarning } from "./console.log.js";

dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRIVATE_KEY = (() => {
  try {
    const keyPath = path.join(__dirname, "..", "key", "private.key");
    return fs.readFileSync(keyPath, "utf8").trim();
  } catch (error) {
    console.error("❌ Failed to load private.key:", error);
    process.exit(1);
  }
})();

/**
 * Validate and normalize JWT expiry value
 * @param {string} envValue - The environment variable value
 * @param {string} fallback - Fallback value if invalid
 * @returns {string} Normalized expiry value
 */
const normalizeExpiry = (envValue, fallback) => {
  if (!envValue) return fallback;

  const validFormat = /^(?:\d+(?:\.\d+)?)(?:s|m|h|d|ms)$/;
  if (!validFormat.test(envValue)) {
    loggingWarning(
      `⚠️ Invalid JWT expiry "${envValue}", using fallback "${fallback}"`,
    );
    return fallback;
  }

  return envValue;
};

/**
 * Service class for JWT token generation
 */
class JwtService {
  /**
   * Generate access token
   * @param {Object} payload - The payload to encode in the token
   * @returns {string} Encrypted access token
   */
  static generateAccessToken(payload) {
    const token = jwt.sign(payload, PRIVATE_KEY, {
      expiresIn: normalizeExpiry(process.env.JWT_EXPIRY_ACCESS, "30m"),
      algorithm: "RS256",
    });
    return encrypt(token);
  }

  /**
   * Generate refresh token
   * @param {Object} payload - The payload to encode in the token
   * @returns {string} Encrypted refresh token
   */
  static generateRefreshToken(payload) {
    const token = jwt.sign(payload, PRIVATE_KEY, {
      expiresIn: normalizeExpiry(process.env.JWT_EXPIRY_REFRESH, "7d"),
      algorithm: "RS256",
    });
    return encrypt(token);
  }
}

export const generateAccessToken = JwtService.generateAccessToken;
export const generateRefreshToken = JwtService.generateRefreshToken;
