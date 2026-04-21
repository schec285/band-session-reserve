import { z } from "zod";

const requiredString = (requiredMessage: string) =>
  z.string({ error: (issue) => (issue.input === undefined ? requiredMessage : undefined) });

export const SignUpSchema = z
  .object({
    name: requiredString("名前を入力してください").min(1, "名前を入力してください"),
    email: requiredString("メールアドレスを入力してください").min(1, "メールアドレスを入力してください"),
    password: requiredString("パスワードを入力してください").min(8, "パスワードは8文字以上で入力してください"),
    confirmPassword: requiredString("確認用パスワードを入力してください").min(1, "確認用パスワードを入力してください"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof SignUpSchema>;
