import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteEventSong } from "@/server/services/admin/songs";
import { DrizzleSongRepository } from "@/server/repositories/songs/song-repository.drizzle";
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
 * イベント曲削除エンドポイント。
 * admin のみアクセス可。
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ eventSongId: string }> }
) {
  return withApiHandler(async () => {
    const { error } = await requireAdmin();
    if (error) return error;

    const { eventSongId } = await params;
    const repo = new DrizzleSongRepository();
    const result = await deleteEventSong(repo, eventSongId);

    if (result.status === "not-found") {
      return NextResponse.json({ message: "イベント曲が見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ message: "曲をイベントから削除しました" });
  });
}
