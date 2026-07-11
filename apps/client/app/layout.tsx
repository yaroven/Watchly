import "@fortawesome/fontawesome-free/css/all.min.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono, PT_Sans } from "next/font/google";
import "./globals.scss";
import Providers from "./providers";

const ptSans = PT_Sans({
  weight: ["400", "700"],
  subsets: ["latin", "cyrillic"],
  display: "swap",
});
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      <body className={`${geistSans.variable} ${ptSans.className} ${geistMono.variable}`}>
        <Providers>{children}</Providers>
        <div id="modal-portal" />
      </body>
    </html>
  );
}
