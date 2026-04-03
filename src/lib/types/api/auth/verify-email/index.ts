import { z } from "zod";

export const VerifyEmailBodySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "認証コードは6桁の数字で入力してください"),
  challenge: z.string().min(1, "チャレンジは必須です"),
});

export type VerifyEmailBody = z.infer<typeof VerifyEmailBodySchema>;

export const VerifyEmailResponseSchema = z.object({
  message: z.string(),
});

export type VerifyEmailResponse = z.infer<typeof VerifyEmailResponseSchema>;
