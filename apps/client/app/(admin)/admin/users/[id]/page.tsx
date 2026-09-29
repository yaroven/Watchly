"use client";

import { UserDetail } from "@/features/user";
import { useParams } from "next/navigation";

export default function Page() {
  const { id } = useParams<{ id: string }>();

  return <UserDetail id={id} />;
}
