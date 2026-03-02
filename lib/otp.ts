import "server-only";

import { createHash, randomInt } from "crypto";

export function generateNumericOtp(length = 6): string {
  const max = 10 ** length;
  return randomInt(0, max).toString().padStart(length, "0");
}

export function hashOtpCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}
