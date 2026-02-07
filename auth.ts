import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { compare } from "bcryptjs";
import { z } from "zod";
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
};

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
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string) || "";
      }
      return session;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
