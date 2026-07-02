import { auth } from "@/auth";
import { getAllUsers } from "@/server/services/admin/users";
import { DrizzleUserRepository } from "@/server/repositories/auth/user-repository.drizzle";
import { AdminUserList } from "@/features/admin/users/AdminUserList";

/**
 * 管理者用登録ユーザー一覧ページ。
 */
export default async function AdminUsersPage() {
  const session = await auth();
  const repo = new DrizzleUserRepository();
  const users = await getAllUsers(repo);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ユーザー管理</h1>
      <AdminUserList users={users} currentUserId={session!.user.id} />
    </div>
  );
}
