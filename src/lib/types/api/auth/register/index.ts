import { z } from "zod";

export const RegisterBodySchema = z.object({
  username: z.string().min(1, "ユーザー名は必須です"),
  email: z.string().min(1, "メールアドレスは必須です").check(z.email("メールアドレスの形式が不正です")),
  password: z.string()
    .min(1, "パスワードは必須です")
    .min(12, "パスワードは12文字以上で、大文字・数字・記号を各1文字以上含めてください")
    .regex(/[A-Z]/, "パスワードは12文字以上で、大文字・数字・記号を各1文字以上含めてください")
    .regex(/[0-9]/, "パスワードは12文字以上で、大文字・数字・記号を各1文字以上含めてください")
    .regex(/[^a-zA-Z0-9]/, "パスワードは12文字以上で、大文字・数字・記号を各1文字以上含めてください"),
});

export type RegisterBody = z.infer<typeof RegisterBodySchema>;

export const RegisterResponseSchema = z.object({
  message: z.string(),
  challenge: z.string(),
});

export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
