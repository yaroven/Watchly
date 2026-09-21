import { RegisterForm } from "@features/auth";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register | Watchly",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
