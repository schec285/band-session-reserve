import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createEvent } from "@/server/services/admin/events";
import { DrizzleAdminEventRepository } from "@/server/repositories/admin/event-repository.drizzle";
import { CreateEventSchema } from "@/lib/types/api/admin/events";
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
 * イベント作成エンドポイント。
 * admin のみアクセス可。バリデーション後にイベントを作成する。
 */
export async function POST(request: Request) {
  return withApiHandler(async () => {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const parsed = CreateEventSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return NextResponse.json({ message: "入力内容に誤りがあります", errors }, { status: 400 });
    }

    const repo = new DrizzleAdminEventRepository();
    const result = await createEvent(repo, parsed.data);

    return NextResponse.json({ event: result.event }, { status: 201 });
  });
}
