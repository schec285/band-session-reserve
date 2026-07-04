import { z } from "zod";
import { passwordPolicySchema } from "@/lib/utils/password";

const requiredString = (requiredMessage: string) =>
  z.string({ error: (issue) => (issue.input === undefined ? requiredMessage : undefined) });

export const ResetPasswordRequestSchema = z.object({
  email: requiredString("メールアドレスを入力してください").min(1, "メールアドレスを入力してください"),
});

export const ResetPasswordSchema = z
  .object({
    password: passwordPolicySchema("パスワードを入力してください"),
    confirmPassword: requiredString("確認用パスワードを入力してください").min(1, "確認用パスワードを入力してください"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

export type ResetPasswordRequestInput = z.infer<typeof ResetPasswordRequestSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
