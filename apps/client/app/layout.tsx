import type { Metadata } from "next";
import { Fredoka, Poppins } from "next/font/google";
import Providers from "./providers";

// Body copy — the face used throughout the design file.
const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

// Section headings only; stands in for Moonjelly from the design.
const fredoka = Fredoka({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4000"),
  title: "Watchly",
  description: "Watch movies and series online with comfort on Watchly",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} ${fredoka.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
