import "server-only";

import { ObjectId } from "mongodb";
import { buildEmailVerificationOtpTemplate } from "@/lib/email-templates";
import { connectToDatabase } from "@/lib/mongodb";
import { sendMail } from "@/lib/mail";
import { generateNumericOtp, hashOtpCode } from "@/lib/otp";
import {
  clearEmailVerificationTokens,
  findValidEmailVerificationToken,
  replaceEmailVerificationToken,
} from "@/lib/verification-token-store";
import { COLLECTIONS } from "@/types/entities";

export const EMAIL_VERIFICATION_OTP_TTL_MINUTES = 30;

type UserDoc = {
  _id: { toString(): string };
  email?: string;
  emailVerified?: Date | null;
};

function userIdFilter(userId: string): Record<string, unknown> {
  if (!ObjectId.isValid(userId)) return { _id: userId };
  return { $or: [{ _id: userId }, { _id: new ObjectId(userId) }] };
}

async function sendEmailVerificationOtpEmail(email: string, code: string) {
  const template = buildEmailVerificationOtpTemplate({
    code,
    ttlMinutes: EMAIL_VERIFICATION_OTP_TTL_MINUTES,
  });

  await sendMail({
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

export async function issueEmailVerificationOtp(params: {
  userId: string;
  email: string;
}) {
  const code = generateNumericOtp(6);
  const tokenHash = hashOtpCode(code);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + EMAIL_VERIFICATION_OTP_TTL_MINUTES * 60 * 1000,
  );

  const { db } = await connectToDatabase();
  await replaceEmailVerificationToken({
    db,
    userId: params.userId,
    email: params.email,
    tokenHash,
    expiresAt,
    now,
  });

  await sendEmailVerificationOtpEmail(params.email, code);
}

export async function verifyEmailVerificationOtp(params: {
  email: string;
  code: string;
}) {
  const tokenHash = hashOtpCode(params.code);
  const now = new Date();
  const { db } = await connectToDatabase();

  const tokenDoc = await findValidEmailVerificationToken({
    db,
    email: params.email,
    tokenHash,
    now,
  });

  if (!tokenDoc) {
    return { ok: false as const, reason: "invalid_or_expired" as const };
  }

  await db.collection(COLLECTIONS.users).updateOne(userIdFilter(tokenDoc.userId), {
    $set: { emailVerified: now, updatedAt: now },
  });

  await clearEmailVerificationTokens({
    db,
    userId: tokenDoc.userId,
    identifier: tokenDoc.identifier,
  });

  return { ok: true as const };
}

export async function resendEmailVerificationOtpForEmail(email: string) {
  const normalizedEmail = email.toLowerCase();
  const { db } = await connectToDatabase();
  const user = (await db.collection(COLLECTIONS.users).findOne(
    { email: normalizedEmail },
    { projection: { email: 1, emailVerified: 1 } },
  )) as UserDoc | null;

  if (!user || user.emailVerified || !user.email) {
    return { ok: true as const, sent: false as const };
  }

  await issueEmailVerificationOtp({
    userId: user._id.toString(),
    email: user.email,
  });

  return { ok: true as const, sent: true as const };
}
