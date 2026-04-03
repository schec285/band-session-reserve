import { z } from "zod";

/**
 * CSRFトークン取得レスポンスのスキーマ。
 * 認証に限らず副作用を伴うすべてのリクエストで使用する。
 */
export const CsrfResponseSchema = z.object({
  csrfToken: z.string(),
});

export type CsrfResponse = z.infer<typeof CsrfResponseSchema>;
