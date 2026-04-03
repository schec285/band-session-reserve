import { z } from "zod";
import { UserRoleSchema } from "@/lib/types/api/auth";

export const LoginBodySchema = z.object({
  email: z.string().min(1, "メールアドレスは必須です").check(z.email("メールアドレスの形式が不正です")),
  password: z.string().min(1, "パスワードは必須です"),
});

export type LoginBody = z.infer<typeof LoginBodySchema>;

export const LoginResponseSchema = z.object({
  message: z.string(),
  role: UserRoleSchema,
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
