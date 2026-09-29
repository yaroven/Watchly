"use client";

import Role from "@/types/role";
import Box from "@mui/material/Box";
import { useAuthStore } from "@shared/lib/auth-store";
import { APP } from "@shared/lib/routes";
import Loader from "@shared/ui/Loader";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

interface AuthorizeViewProps {
  roles: Role[];
  children: ReactNode;
}

export default function AuthorizeView({ roles, children }: AuthorizeViewProps) {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.role);
  const isAuthorized = !!role && roles.includes(role);

  // The store starts empty on every hard navigation — wait for the boot-time session
  // restore (see Providers.tsx) to resolve before deciding the role doesn't match,
  // otherwise every direct visit to a gated route bounces a logged-in admin away.
  useEffect(() => {
    if (status === "resolved" && !isAuthorized) router.replace(APP.DISCOVER);
  }, [status, isAuthorized, router]);

  if (status !== "resolved" || !isAuthorized) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Loader />
      </Box>
    );
  }

  return <>{children}</>;
}
