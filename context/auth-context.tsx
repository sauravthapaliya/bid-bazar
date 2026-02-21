"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import type { KycStatus, UserRole } from "@/types/entities";

type AuthContextValue = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: UserRole;
    isSellerVerified: boolean;
    kycStatus: KycStatus;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  status: "authenticated" | "loading" | "unauthenticated";
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, status } = useSession();

  const value = useMemo<AuthContextValue>(
    () => ({
      user: data?.user ?? null,
      isAuthenticated: status === "authenticated",
      isLoading: status === "loading",
      status,
    }),
    [data?.user, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
