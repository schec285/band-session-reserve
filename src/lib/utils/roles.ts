import { z } from "zod";

/**
 * ロールのZodスキーマ。
 */
export const RoleSchema = z.enum(["member", "admin"]);

export type Role = z.infer<typeof RoleSchema>;

/**
 * ロールの日本語ラベル定義。
 */
export const ROLE_LABELS: Record<Role, string> = {
  member: "一般利用者",
  admin: "管理者",
};
