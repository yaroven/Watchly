import { TitleCreate } from "@/features/title";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Title | Watchly Admin",
};

export default function Page() {
  return <TitleCreate />;
}
