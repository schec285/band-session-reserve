import { z } from "zod";
import { PartSchema } from "@/lib/utils/parts";

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
