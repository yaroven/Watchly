import type { useTranslations } from "next-intl";
import { z } from "zod";

type AuthTranslator = ReturnType<typeof useTranslations<"auth">>;

export const createLoginSchema = (t: AuthTranslator) =>
  z.object({
    email: z.email({ error: t("validation.emailInvalid") }),
    password: z.string().min(6, t("validation.passwordMin", { min: 6 })),
    rememberMe: z.boolean(),
  });

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;

export const createRegisterSchema = (t: AuthTranslator) =>
  z
    .object({
      name: z.string().trim().min(1, t("validation.nameRequired")),
      email: z.email({ error: t("validation.emailInvalid") }),
      password: z.string().min(6, t("validation.passwordMin", { min: 6 })),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("validation.passwordsMismatch"),
      path: ["confirmPassword"],
    });

export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;
