import "server-only";

import { createHash, randomInt } from "crypto";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { sendMail } from "@/lib/mail";
import { COLLECTIONS } from "@/types/entities";

const EMAIL_VERIFICATION_TOKEN_TTL_MINUTES = 30;

type VerificationTokenDoc = {
  _id?: ObjectId;
  identifier: string;
  token: string;
  expires: Date;
  userId: string;
  createdAt: Date;
};

function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

function userIdFilter(userId: string): Record<string, unknown> {
  if (!ObjectId.isValid(userId)) return { _id: userId };
  return { $or: [{ _id: userId }, { _id: new ObjectId(userId) }] };
}

export async function issueEmailVerificationToken(userId: string, email: string) {
  const otpCode = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const token = hashToken(otpCode);
  const now = new Date();
  const expires = new Date(now.getTime() + EMAIL_VERIFICATION_TOKEN_TTL_MINUTES * 60 * 1000);

  const { db } = await connectToDatabase();
  const verificationTokens = db.collection<VerificationTokenDoc>(COLLECTIONS.verificationTokens);

  await verificationTokens.deleteMany({ userId });
  await verificationTokens.insertOne({
    identifier: email.toLowerCase(),
    token,
    expires,
    userId,
    createdAt: now,
  });

  return otpCode;
}

export async function sendVerificationEmail(email: string, otpCode: string) {
  await sendMail({
    to: email,
    subject: "Verify your BIDBZAR email",
    text: `Your BIDBZAR verification code is ${otpCode}. It expires in ${EMAIL_VERIFICATION_TOKEN_TTL_MINUTES} minutes.`,
    html: `<p>Welcome to BIDBZAR.</p><p>Your verification code is <strong style="font-size:20px;letter-spacing:3px;">${otpCode}</strong>.</p><p>This code expires in ${EMAIL_VERIFICATION_TOKEN_TTL_MINUTES} minutes.</p>`,
  });
}

export async function verifyEmailByOtp(email: string, otpCode: string) {
  const token = hashToken(otpCode);
  const now = new Date();
  const { db } = await connectToDatabase();

  const verificationTokens = db.collection<VerificationTokenDoc>(COLLECTIONS.verificationTokens);
  const tokenDoc = await verificationTokens.findOne({
    identifier: email.toLowerCase(),
    token,
    expires: { $gt: now },
  });

  if (!tokenDoc) {
    return { ok: false as const, reason: "invalid_or_expired" as const };
  }

  await db.collection(COLLECTIONS.users).updateOne(userIdFilter(tokenDoc.userId), {
    $set: { emailVerified: now, updatedAt: now },
  });

  await verificationTokens.deleteMany({
    $or: [{ userId: tokenDoc.userId }, { identifier: tokenDoc.identifier }],
  });

  return { ok: true as const, email: tokenDoc.identifier };
}
