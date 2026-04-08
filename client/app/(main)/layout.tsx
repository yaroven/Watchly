import "@fortawesome/fontawesome-free/css/all.min.css";
import { Metadata } from "next";
import Header from "../components/ui/Header";
import "../globals.scss";

export const metadata: Metadata = {
  title: "Watchly",
  description: "Watch movies and series online with comfort on Watchly",
};

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <Header />
      {children}
    </div>
  );
}
