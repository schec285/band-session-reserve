import { z } from "zod";
import { passwordPolicySchema, isPasswordSimilarToIdentity } from "@/lib/utils/password";

const requiredString = (requiredMessage: string) =>
  z.string({ error: (issue) => (issue.input === undefined ? requiredMessage : undefined) });

export const SignUpSchema = z
  .object({
    name: requiredString("名前を入力してください").min(1, "名前を入力してください"),
    email: requiredString("メールアドレスを入力してください").min(1, "メールアドレスを入力してください"),
    password: passwordPolicySchema("パスワードを入力してください"),
    confirmPassword: requiredString("確認用パスワードを入力してください").min(1, "確認用パスワードを入力してください"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  })
  .superRefine((data, ctx) => {
    if (isPasswordSimilarToIdentity(data.password, { email: data.email, name: data.name })) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "パスワードにメールアドレスや名前を含めることはできません",
      });
    }
  });

export type SignUpInput = z.infer<typeof SignUpSchema>;
