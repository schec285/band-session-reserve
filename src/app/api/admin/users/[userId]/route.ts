import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateUserRole } from "@/server/services/admin/users";
import { DrizzleUserRepository } from "@/server/repositories/auth/user-repository.drizzle";
import { UpdateUserRoleSchema } from "@/lib/types/api/admin/users";
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
  return { error: null, userId: session.user.id };
}

/**
 * ユーザーのロール更新エンドポイント。
 * admin のみアクセス可。自分自身のロールは変更できない。
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  return withApiHandler(async () => {
    const { error, userId: currentUserId } = await requireAdmin();
    if (error) return error;

    const { userId } = await params;
    const body = await request.json();
    const parsed = UpdateUserRoleSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return NextResponse.json({ message: "入力内容に誤りがあります", errors }, { status: 400 });
    }

    const repo = new DrizzleUserRepository();
    const result = await updateUserRole(repo, currentUserId!, userId, parsed.data.role);

    if (result.status === "not-found") {
      return NextResponse.json({ message: "ユーザーが見つかりません" }, { status: 404 });
    }
    if (result.status === "self-role-change-forbidden") {
      return NextResponse.json({ message: "自分自身のロールは変更できません" }, { status: 400 });
    }

    return NextResponse.json({ user: result.user });
  });
}
