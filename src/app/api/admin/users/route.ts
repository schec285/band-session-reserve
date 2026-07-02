import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllUsers } from "@/server/services/admin/users";
import { DrizzleUserRepository } from "@/server/repositories/auth/user-repository.drizzle";
import { withApiHandler } from "@/lib/api/error-handler";

/**
 * admin 権限を確認するヘルパー。
 * 未認証は 401、admin 以外は 403 を返す。
 */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ message: "認証が必要です" }, { status: 401 }) };
  }
  if (session.user.role !== "admin") {
    return { error: NextResponse.json({ message: "権限がありません" }, { status: 403 }) };
  }
  return { error: null };
}

/**
 * 登録ユーザー一覧取得エンドポイント。
 * admin のみアクセス可。
 */
export async function GET(_request: Request) {
  return withApiHandler(async () => {
    const { error } = await requireAdmin();
    if (error) return error;

    const repo = new DrizzleUserRepository();
    const users = await getAllUsers(repo);

    return NextResponse.json({ users });
  });
}
