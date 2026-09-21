import { z } from "zod";

export const LoginSchema = z.object({
  email: z.email({ error: "Enter a valid email" }),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean(),
});

export type LoginFormValues = z.infer<typeof LoginSchema>;

export const RegisterSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.email({ error: "Enter a valid email" }),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof RegisterSchema>;
