import type { IUserRepository, IUserListRecord } from "@/server/repositories/auth/user-repository";
import type { AdminUserResponse, Role } from "@/lib/types/api/admin/users";

type UpdateUserRoleResult =
  | { status: "ok"; user: AdminUserResponse }
  | { status: "not-found" }
  | { status: "self-role-change-forbidden" };

/**
 * リポジトリのレコードを AdminUserResponse に変換する。
 */
function toResponse(record: IUserListRecord): AdminUserResponse {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    role: record.role as Role,
    isVerified: record.emailVerified !== null,
    createdAt: record.createdAt.toISOString(),
  };
}

/**
 * 全ユーザー一覧を取得する。
 */
export async function getAllUsers(repo: IUserRepository): Promise<AdminUserResponse[]> {
  const records = await repo.findAll();
  return records.map(toResponse);
}

/**
 * ユーザーのロールを更新する。
 * 自分自身のロールは変更できず、対象ユーザーが存在しない場合は status: "not-found" を返す。
 */
export async function updateUserRole(
  repo: IUserRepository,
  currentUserId: string,
  targetUserId: string,
  role: Role
): Promise<UpdateUserRoleResult> {
  if (currentUserId === targetUserId) {
    return { status: "self-role-change-forbidden" };
  }

  const record = await repo.updateRole(targetUserId, role);
  if (!record) return { status: "not-found" };

  return { status: "ok", user: toResponse(record) };
}
