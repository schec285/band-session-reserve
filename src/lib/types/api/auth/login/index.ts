import { z } from "zod";

export const UserRoleSchema = z.enum(["member", "admin"]);

export type UserRole = z.infer<typeof UserRoleSchema>;

export const LoginBodySchema = z.object({
  email: z.string().min(1, "メールアドレスは必須です").check(z.email("メールアドレスの形式が不正です")),
  password: z.string().min(1, "パスワードは必須です"),
});

export type LoginBody = z.infer<typeof LoginBodySchema>;

export const LoginResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  role: UserRoleSchema,
  csrfToken: z.string(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
