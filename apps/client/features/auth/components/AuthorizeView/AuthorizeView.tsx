"use client";

import Role from "@/types/role";
import { useAuthStore } from "@shared/lib/auth-store";
import type { ReactNode } from "react";

interface AuthorizeViewProps {
  roles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}
export default function AuthorizeView({ roles, children, fallback = null }: AuthorizeViewProps) {
  const role = useAuthStore((state) => state.role);

  if (!role || !roles.includes(role)) return <>{fallback}</>;

  return <>{children}</>;
}
