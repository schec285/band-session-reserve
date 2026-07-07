import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { removeReservation } from "@/server/services/admin/songs";
import { DrizzleSongRepository } from "@/server/repositories/songs/song-repository.drizzle";
import { PartSchema } from "@/lib/utils/parts";
import { withApiHandler } from "@/lib/api/error-handler";
import { verifyCsrfToken } from "@/lib/api/csrf";

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
 * イベント曲の指定パートのエントリー（予約）削除エンドポイント。
 * 募集パート自体は変更せず、そのパートに対する予約のみを削除する。admin のみアクセス可。
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventSongId: string; part: string }> }
) {
  return withApiHandler(async () => {
    const csrfError = verifyCsrfToken(request);
    if (csrfError) return csrfError;

    const { error } = await requireAdmin();
    if (error) return error;

    const { eventSongId, part } = await params;
    const parsedPart = PartSchema.safeParse(part);
    if (!parsedPart.success) {
      return NextResponse.json({ message: "パートが不正です" }, { status: 400 });
    }

    const repo = new DrizzleSongRepository();
    const result = await removeReservation(repo, eventSongId, parsedPart.data);

    if (result.status === "not-found") {
      return NextResponse.json({ message: "エントリーが見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ message: "エントリーを削除しました" });
  });
}
