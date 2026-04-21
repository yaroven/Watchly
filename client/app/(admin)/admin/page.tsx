import { ADMIN } from "@/shared/lib/routes";
import { redirect } from "next/navigation";

export default function Page() {
  redirect(ADMIN.DASHBOARD);
}
