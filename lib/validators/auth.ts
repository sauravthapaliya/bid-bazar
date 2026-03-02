import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const verifyEmailOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().trim().regex(/^\d{6}$/),
});

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});
