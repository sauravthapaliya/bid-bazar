import "next-auth";
import "next-auth/jwt";
import type { KycStatus, UserRole } from "@/types/entities";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      isSellerVerified: boolean;
      kycStatus: KycStatus;
    };
  }

  interface User {
    role?: UserRole;
    isSellerVerified?: boolean;
    kycStatus?: KycStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    isSellerVerified?: boolean;
    kycStatus?: KycStatus;
  }
}
