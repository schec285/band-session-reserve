import { z } from "zod";

export const PasswordResetBodySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "認証コードは6桁の数字で入力してください"),
  challenge: z.string().min(1, "チャレンジは必須です"),
  password: z.string()
    .min(1, "パスワードは必須です")
    .min(12, "パスワードは12文字以上で、大文字・数字・記号を各1文字以上含めてください")
    .regex(/[A-Z]/, "パスワードは12文字以上で、大文字・数字・記号を各1文字以上含めてください")
    .regex(/[0-9]/, "パスワードは12文字以上で、大文字・数字・記号を各1文字以上含めてください")
    .regex(/[^a-zA-Z0-9]/, "パスワードは12文字以上で、大文字・数字・記号を各1文字以上含めてください"),
});

export type PasswordResetBody = z.infer<typeof PasswordResetBodySchema>;

export const PasswordResetResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type PasswordResetResponse = z.infer<typeof PasswordResetResponseSchema>;
