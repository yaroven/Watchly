"use client";
import { ADMIN } from "@/app/constants/routes";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  return router.replace(ADMIN.DASHBOARD);
}
