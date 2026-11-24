"use client";

import { useRouter } from "@/i18n/navigation";
import Role from "@/types/role";
import Box from "@mui/material/Box";
import { APP } from "@shared/lib/routes";
import { useLoginPath } from "@shared/lib/use-login-path";
import { useViewer } from "@shared/lib/use-viewer";
import Loader from "@shared/ui/Loader";
import { useEffect, type ReactNode } from "react";

interface AuthorizeViewProps {
  roles: Role[];
  children: ReactNode;
}

export default function AuthorizeView({ roles, children }: AuthorizeViewProps) {
  const router = useRouter();
  const viewer = useViewer();
  const signInPath = useLoginPath();
  const isAuthorized = viewer.status === "signed-in" && !!viewer.role && roles.includes(viewer.role);

  useEffect(() => {
    if (viewer.status === "anonymous") router.replace(signInPath());
    else if (viewer.status === "signed-in" && !isAuthorized) router.replace(APP.DISCOVER);
  }, [viewer.status, isAuthorized, signInPath, router]);

  if (!isAuthorized) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Loader />
      </Box>
    );
  }

  return <>{children}</>;
}
