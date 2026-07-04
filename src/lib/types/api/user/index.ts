import { z } from "zod";
import { PartSchema } from "@/lib/utils/parts";
import { passwordPolicySchema } from "@/lib/utils/password";

/**
 * GET /api/user/profile のレスポンス型。
 */
export type GetProfileResponse = {
  email: string;
  name: string;
  part: string | null;
  comment: string | null;
};

/**
 * PUT /api/user/profile のリクエストボディスキーマ。
 */
export const UpdateProfileSchema = z.object({
  name: z.string().min(1, "名前を入力してください"),
  part: PartSchema.nullable().optional(),
  comment: z.string().nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

/**
 * PUT /api/user/password のリクエストボディスキーマ。
 */
export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
    newPassword: passwordPolicySchema("パスワードを入力してください"),
    confirmNewPassword: z.string().min(1, "確認用パスワードを入力してください"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "パスワードが一致しません",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
