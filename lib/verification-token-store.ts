import "server-only";

import { type Db, ObjectId } from "mongodb";
import { COLLECTIONS } from "@/types/entities";

export type VerificationTokenDoc = {
  _id?: ObjectId;
  identifier: string;
  token: string;
  expires: Date;
  userId: string;
  createdAt: Date;
};

export async function replaceEmailVerificationToken(params: {
  db: Db;
  userId: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  now: Date;
}) {
  const tokens = params.db.collection<VerificationTokenDoc>(COLLECTIONS.verificationTokens);
  await tokens.deleteMany({ userId: params.userId });
  await tokens.insertOne({
    identifier: params.email.toLowerCase(),
    token: params.tokenHash,
    expires: params.expiresAt,
    userId: params.userId,
    createdAt: params.now,
  });
}

export async function findValidEmailVerificationToken(params: {
  db: Db;
  email: string;
  tokenHash: string;
  now: Date;
}): Promise<VerificationTokenDoc | null> {
  const tokens = params.db.collection<VerificationTokenDoc>(COLLECTIONS.verificationTokens);
  return tokens.findOne({
    identifier: params.email.toLowerCase(),
    token: params.tokenHash,
    expires: { $gt: params.now },
  });
}

export async function clearEmailVerificationTokens(params: {
  db: Db;
  userId: string;
  identifier: string;
}) {
  const tokens = params.db.collection<VerificationTokenDoc>(COLLECTIONS.verificationTokens);
  await tokens.deleteMany({
    $or: [{ userId: params.userId }, { identifier: params.identifier }],
  });
}
