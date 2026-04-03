import { z } from "zod";

/**
 * フィールドごとのエラー詳細スキーマ。
 * バリデーションエラー（400）・コンフリクト（409）のレスポンスで使用する。
 */
export const FieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export type FieldError = z.infer<typeof FieldErrorSchema>;

/**
 * すべてのエラーレスポンスに共通する基底スキーマ。
 * errors はバリデーション・コンフリクト系のエラーのみ含まれる。
 */
export const ErrorResponseSchema = z.object({
  message: z.string(),
  errors: z.array(FieldErrorSchema).optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
