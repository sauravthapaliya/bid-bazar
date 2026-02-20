import crypto from "node:crypto";

export function generateEsewaSignature(secretKey: string, message: string): string {
  return crypto.createHmac("sha256", secretKey).update(message).digest("base64");
}
