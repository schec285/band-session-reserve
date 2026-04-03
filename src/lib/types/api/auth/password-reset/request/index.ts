import { z } from "zod";

export const PasswordResetRequestBodySchema = z.object({
  email: z.string().min(1, "メールアドレスは必須です").check(z.email("メールアドレスの形式が不正です")),
});

export type PasswordResetRequestBody = z.infer<typeof PasswordResetRequestBodySchema>;

export const PasswordResetRequestResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  challenge: z.string(),
});

export type PasswordResetRequestResponse = z.infer<typeof PasswordResetRequestResponseSchema>;
