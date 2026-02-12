import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const ALGORITHM = "aes-256-cbc";

function getKey() {
  const secret =
    process.env.CRYPTO_SECRET ||
    process.env.JWT_SECRET ||
    "default_change_this";
  return crypto.createHash("sha256").update(String(secret)).digest();
}

export function encrypt(plainText) {
  const iv = crypto.randomBytes(16);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plainText, "utf8", "base64");
  encrypted += cipher.final("base64");
  const ivBase64 = iv.toString("base64");
  return `${ivBase64}:${encrypted}`;
}

export function decrypt(encryptedText) {
  const parts = encryptedText.split(":");
  if (parts.length !== 2) throw new Error("Invalid encrypted data");
  const iv = Buffer.from(parts[0], "base64");
  const data = parts[1];
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(data, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
