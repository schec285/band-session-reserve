import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateEvent, deleteEvent } from "@/server/services/admin/events";
import { DrizzleAdminEventRepository } from "@/server/repositories/admin/event-repository.drizzle";
import { UpdateEventSchema } from "@/lib/types/api/admin/events";
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
 * イベント更新エンドポイント。
 * admin のみアクセス可。全フィールドを上書き更新する。
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return withApiHandler(async () => {
    const { error } = await requireAdmin();
    if (error) return error;

    const { eventId } = await params;
    const body = await request.json();
    const parsed = UpdateEventSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return NextResponse.json({ message: "入力内容に誤りがあります", errors }, { status: 400 });
    }

    const repo = new DrizzleAdminEventRepository();
    const result = await updateEvent(repo, eventId, parsed.data);

    if (result.status === "not-found") {
      return NextResponse.json({ message: "イベントが見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ event: result.event });
  });
}

/**
 * イベント削除エンドポイント。
 * admin のみアクセス可。
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return withApiHandler(async () => {
    const { error } = await requireAdmin();
    if (error) return error;

    const { eventId } = await params;
    const repo = new DrizzleAdminEventRepository();
    const result = await deleteEvent(repo, eventId);

    if (result.status === "not-found") {
      return NextResponse.json({ message: "イベントが見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ message: "イベントを削除しました" });
  });
}
