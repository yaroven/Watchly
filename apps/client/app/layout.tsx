import Providers from "@shared/providers";
import type { Metadata } from "next";
import { Alumni_Sans, Anton, Fredoka, Poppins } from "next/font/google";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const fredoka = Fredoka({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const alumniSans = Alumni_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-tagline",
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
      <body className={`${poppins.variable} ${fredoka.variable} ${anton.variable} ${alumniSans.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
