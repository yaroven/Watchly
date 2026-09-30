import { WatchlistScreen } from "@features/title";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Watchlist | Watchly",
};

export default function Page() {
  return <WatchlistScreen />;
}
