import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { decrypt } from "../middleware/crypto.js";
import { loggingWarning, loggingInfo } from "./console.log.js";
// lightweight local response helpers (avoid missing external utils dependency)
const response = {
  unauthorized: (res) =>
    res.status(401).json({ status: false, message: "Unauthorized", data: [] }),
  forbidden: (res) =>
    res.status(403).json({ status: false, message: "Forbidden", data: [] }),
};
import { generateAccessToken } from "../middleware/jwt.js";

dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_KEY = (() => {
  try {
    const keyPath = path.join(__dirname, "..", "key", "public.key");
    return fs.readFileSync(keyPath, "utf8").trim();
  } catch (error) {
    console.error("❌ Failed to load public.key:", error);
    process.exit(1);
  }
})();

/**
 * Verify JWT token from Authorization header
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const verifyJWT = (req, res, next) => {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return response.unauthorized(res);
  }

  const rawToken = authHeader.split(" ")[1];

  let jwtToken;

  // 🔓 Decrypt first
  try {
    jwtToken = decrypt(rawToken);
  } catch (err) {
    loggingWarning(`Token decryption failed: ${err?.message}`);
    return response.forbidden(res);
  }

  // 🔐 Then verify
  try {
    const decoded = jwt.verify(jwtToken, PUBLIC_KEY, {
      algorithms: ["RS256"],
    });

    req.id = decoded?.id;
    return next();
  } catch (err) {
    loggingWarning(`JWT verify error: ${err?.message}`);

    if (err.name === "TokenExpiredError") {
      return response.unauthorized(res);
    }

    return response.forbidden(res);
  }
};
