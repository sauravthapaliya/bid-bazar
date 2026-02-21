import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { compare } from "bcryptjs";
import { z } from "zod";
import { ObjectId } from "mongodb";
import clientPromise, { connectToDatabase } from "@/lib/mongodb";
import { ensureDatabaseSchema } from "@/lib/db-schema";
import { COLLECTIONS } from "@/types/entities";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type AuthUserDoc = {
  _id: { toString(): string };
  name?: string;
  email?: string;
  image?: string | null;
  passwordHash?: string;
  role?: "user" | "seller" | "admin";
  isSellerVerified?: boolean;
  kycStatus?: "not_submitted" | "pending" | "approved" | "rejected";
};

function idFilter(id: string): Record<string, unknown> {
  if (!ObjectId.isValid(id)) return { _id: id };
  const objectId = new ObjectId(id);
  return {
    $or: [{ _id: id }, { _id: objectId }],
  };
}

const authConfig: NextAuthConfig = {
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: process.env.MONGODB_DB,
  }),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials: Record<string, unknown> | undefined) {
        await ensureDatabaseSchema();

        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        const password = parsed.data.password;

        const { db } = await connectToDatabase();
        const user = (await db
          .collection(COLLECTIONS.users)
          .findOne({ email })) as AuthUserDoc | null;
        if (!user || typeof user.passwordHash !== "string") return null;

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user._id.toString(),
          name: user.name ?? "",
          email: user.email,
          image: user.image ?? null,
          role: user.role ?? "user",
          isSellerVerified: user.isSellerVerified === true,
          kycStatus: user.kycStatus ?? "not_submitted",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role ?? "user";
        token.isSellerVerified = user.isSellerVerified === true;
        token.kycStatus = user.kycStatus ?? "not_submitted";
      } else if (token.sub && !token.role) {
        const { db } = await connectToDatabase();
        const existingUser = (await db.collection(COLLECTIONS.users).findOne(
          idFilter(token.sub),
          {
            projection: {
              role: 1,
              isSellerVerified: 1,
              kycStatus: 1,
            },
          }
        )) as
          | {
              role?: "user" | "seller" | "admin";
              isSellerVerified?: boolean;
              kycStatus?: "not_submitted" | "pending" | "approved" | "rejected";
            }
          | null;

        token.role = existingUser?.role ?? "user";
        token.isSellerVerified = existingUser?.isSellerVerified === true;
        token.kycStatus = existingUser?.kycStatus ?? "not_submitted";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string) || "";
        session.user.role = (token.role as "user" | "seller" | "admin") ?? "user";
        session.user.isSellerVerified = token.isSellerVerified === true;
        session.user.kycStatus =
          (token.kycStatus as "not_submitted" | "pending" | "approved" | "rejected") ??
          "not_submitted";
      }
      return session;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
