import { z } from "zod";
import { RoleSchema } from "@/lib/utils/roles";

export type { Role } from "@/lib/utils/roles";

/**
 * GET /api/admin/users のレスポンス内、ユーザー1件を表すスキーマ。
 */
export const AdminUserResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: RoleSchema,
  createdAt: z.string(),
});

export type AdminUserResponse = z.infer<typeof AdminUserResponseSchema>;

/**
 * PATCH /api/admin/users/[userId] のリクエストボディスキーマ。
 * ユーザーのロールを更新する。
 * エラーレスポンスは ErrorResponse 型（src/lib/types/api/index.ts）を使用する。
 */
export const UpdateUserRoleSchema = z.object({
  role: RoleSchema,
});

export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>;
