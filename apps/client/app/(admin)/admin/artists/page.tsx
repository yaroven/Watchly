import { ArtistsLibrary } from "@/features/artist";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Actors | Watchly Admin",
};

export default function Page() {
  return <ArtistsLibrary />;
}
