"use client";

import { APP } from "@/shared/lib/routes";
import { zodResolver } from "@hookform/resolvers/zod";
import LockIcon from "@mui/icons-material/Lock";
import MailIcon from "@mui/icons-material/Mail";
import PersonIcon from "@mui/icons-material/Person";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import Typography from "@mui/material/Typography";
import { authStore } from "@shared/lib/auth-store";
import { decodeAccessToken } from "@shared/lib/decode-jwt";
import Button from "@shared/ui/Button";
import FormField from "@shared/ui/FormField";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import AuthService from "../../api/auth.service";
import { RegisterFormValues, RegisterSchema } from "../../schemas/auth";
import SocialAuthButtons from "../SocialAuthButtons";

export default function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  // `name`/`confirmPassword` only drive client-side validation — the API takes email/password.
  const onSubmit = async ({ email, password }: RegisterFormValues) => {
    setError(null);
    try {
      const session = await AuthService.register({ email, password });
      const claims = decodeAccessToken(session.accessToken);
      authStore.getState().setSession({
        token: session.accessToken,
        userId: claims?.userId ?? session.userId,
        role: claims?.role ?? session.role,
      });
      router.push(APP.DISCOVER);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{
        width: "478px",
        maxWidth: "100%",
        p: "48px",
        borderRadius: "24px",
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "#000000",
        display: "flex",
        flexDirection: "column",
        gap: "36px",
      }}
    >
      <Typography component="h1" sx={{ textAlign: "center", fontSize: "40px", fontWeight: 700, color: "#ffffff" }}>
        register
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <FormField
          variant="bordered"
          name="name"
          label="Name"
          register={register}
          error={errors.name}
          endAdornment={
            <InputAdornment position="end">
              <PersonIcon sx={{ fontSize: "20px", color: "text.secondary" }} />
            </InputAdornment>
          }
        />

        <FormField
          variant="bordered"
          name="email"
          type="email"
          label="Email"
          register={register}
          error={errors.email}
          endAdornment={
            <InputAdornment position="end">
              <MailIcon sx={{ fontSize: "20px", color: "text.secondary" }} />
            </InputAdornment>
          }
        />

        <FormField
          variant="bordered"
          name="password"
          type="password"
          label="Password"
          register={register}
          error={errors.password}
          endAdornment={
            <InputAdornment position="end">
              <LockIcon sx={{ fontSize: "20px", color: "text.secondary" }} />
            </InputAdornment>
          }
        />

        <FormField
          variant="bordered"
          name="confirmPassword"
          type="password"
          label="Confirm Password"
          register={register}
          error={errors.confirmPassword}
          endAdornment={
            <InputAdornment position="end">
              <LockIcon sx={{ fontSize: "20px", color: "text.secondary" }} />
            </InputAdornment>
          }
        />
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        isPill
        disabled={isSubmitting}
        sx={{ height: "52px", backgroundColor: "#e5e5e5", color: "#191919", "&:hover": { backgroundColor: "#ffffff" } }}
      >
        {isSubmitting ? "Creating account…" : "Register"}
      </Button>

      <SocialAuthButtons />

      <Typography sx={{ textAlign: "center", fontSize: "14px", color: "text.secondary" }}>
        Already have an account?{" "}
        <Typography component={Link} href={APP.LOGIN} sx={{ fontSize: "inherit", fontWeight: 700, color: "primary.main" }}>
          Login!
        </Typography>
      </Typography>
    </Box>
  );
}
