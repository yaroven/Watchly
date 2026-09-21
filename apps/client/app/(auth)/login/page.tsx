import { LoginForm } from "@features/auth";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Watchly",
};

export default function LoginPage() {
  return <LoginForm />;
}
