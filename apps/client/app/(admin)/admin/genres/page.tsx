import { GenresLibrary } from "@/features/genre";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Genres | Watchly Admin",
};

export default function Page() {
  return <GenresLibrary />;
}
