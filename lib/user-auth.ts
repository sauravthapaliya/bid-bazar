import "server-only";

import { ObjectId, type Db } from "mongodb";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { COLLECTIONS, type KycStatus, type UserRole } from "@/types/entities";

type IdLike = string | ObjectId;

type UserRecordRaw = {
  _id: unknown;
  email?: unknown;
  name?: unknown;
  role?: unknown;
  isSellerVerified?: unknown;
  kycStatus?: unknown;
};

export type UserRecord = {
  id: string;
  email: string | null;
  name: string | null;
  role: UserRole;
  isSellerVerified: boolean;
  kycStatus: KycStatus;
};

export function idVariants(id: string): IdLike[] {
  if (!ObjectId.isValid(id)) return [id];
  return [id, new ObjectId(id)];
}

export function idFilter(id: string): Record<string, unknown> {
  const variants = idVariants(id);
  if (variants.length === 1) return { _id: variants[0] };
  return { $or: variants.map((value) => ({ _id: value })) };
}

function asUserRole(value: unknown): UserRole {
  if (value === "admin" || value === "seller" || value === "user") return value;
  return "user";
}

function asKycStatus(value: unknown): KycStatus {
  if (
    value === "not_submitted" ||
    value === "pending" ||
    value === "approved" ||
    value === "rejected"
  ) {
    return value;
  }
  return "not_submitted";
}

function asUserRecord(doc: UserRecordRaw | null): UserRecord | null {
  if (!doc) return null;
  return {
    id: String(doc._id),
    email: typeof doc.email === "string" ? doc.email : null,
    name: typeof doc.name === "string" ? doc.name : null,
    role: asUserRole(doc.role),
    isSellerVerified: doc.isSellerVerified === true,
    kycStatus: asKycStatus(doc.kycStatus),
  };
}

export async function findUserById(db: Db, userId: string): Promise<UserRecord | null> {
  const doc = (await db.collection(COLLECTIONS.users).findOne(
    idFilter(userId),
    {
      projection: {
        email: 1,
        name: 1,
        role: 1,
        isSellerVerified: 1,
        kycStatus: 1,
      },
    }
  )) as UserRecordRaw | null;

  return asUserRecord(doc);
}

export async function getCurrentUserRecord(): Promise<UserRecord | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { db } = await connectToDatabase();
  return findUserById(db, session.user.id);
}

export function isAdmin(user: UserRecord): boolean {
  return user.role === "admin";
}

export function canSell(user: UserRecord): boolean {
  return user.role === "admin" || user.isSellerVerified;
}
