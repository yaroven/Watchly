"use client";

import { useRouter } from "@/i18n/navigation";
import { APP } from "@/shared/lib/routes";
import { zodResolver } from "@hookform/resolvers/zod";
import LockIcon from "@mui/icons-material/Lock";
import MailIcon from "@mui/icons-material/Mail";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Typography from "@mui/material/Typography";
import { describeApiError, SessionUnusableError } from "@shared/api/api-error";
import { LOGIN_RETURN_PARAM, safeReturnPath } from "@shared/lib/login-redirect";
import { startSession } from "@shared/lib/session";
import { tokens } from "@shared/mui/theme";
import Button from "@shared/ui/Button";
import FormField from "@shared/ui/FormField";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import AuthService from "../../api/auth.service";
import { createLoginSchema, LoginFormValues } from "../../schemas/auth";
import SocialAuthButtons from "../SocialAuthButtons";

export default function LoginForm() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const loginSchema = useMemo(() => createLoginSchema(t), [t]);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const onSubmit = async ({ email, password }: LoginFormValues) => {
    setError(null);
    try {
      const session = await AuthService.login({ email, password });
      if (!startSession(session)) throw new SessionUnusableError("The sign-in response carried no identity this client can use");
      router.push(safeReturnPath(new URLSearchParams(window.location.search).get(LOGIN_RETURN_PARAM)) ?? APP.DISCOVER);
    } catch (err) {
      setError(describeApiError(err, tErrors, { 400: t("errors.invalidCredentials"), 401: t("errors.invalidCredentials") }));
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
        backgroundColor: tokens.surface.paper,
        display: "flex",
        flexDirection: "column",
        gap: "36px",
      }}
    >
      <Typography component="h1" sx={{ textAlign: "center", fontSize: "40px", fontWeight: 700, color: tokens.text.primary }}>
        {t("login.heading")}
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <FormField
          variant="bordered"
          name="email"
          type="email"
          label={t("fields.email")}
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
          label={t("fields.password")}
          register={register}
          error={errors.password}
          endAdornment={
            <InputAdornment position="end">
              <LockIcon sx={{ fontSize: "20px", color: "text.secondary" }} />
            </InputAdornment>
          }
        />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: "-16px" }}>
        <Controller
          control={control}
          name="rememberMe"
          render={({ field }) => (
            <FormControlLabel
              control={<Checkbox {...field} checked={field.value} size="small" sx={{ color: "text.secondary" }} />}
              label={t("login.rememberMe")}
              sx={{ color: "text.secondary", "& .MuiFormControlLabel-label": { fontSize: "14px" } }}
            />
          )}
        />

        <Typography sx={{ fontSize: "14px", color: "text.secondary", cursor: "default" }}>{t("login.forgotPassword")}</Typography>
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
        sx={{
          height: "52px",
          backgroundColor: tokens.text.field,
          color: tokens.surface.default,
          "&:hover": { backgroundColor: tokens.text.primary },
        }}
      >
        {isSubmitting ? t("login.submitting") : t("login.submit")}
      </Button>

      <SocialAuthButtons />

      <Typography sx={{ textAlign: "center", fontSize: "14px", color: "text.secondary" }}>
        {t.rich("login.noAccount", {
          link: (chunks) => (
            <Typography component={Link} href={APP.REGISTER} sx={{ fontSize: "inherit", fontWeight: 700, color: "primary.main" }}>
              {chunks}
            </Typography>
          ),
        })}
      </Typography>
    </Box>
  );
}
