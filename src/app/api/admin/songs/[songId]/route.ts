import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateSong, deleteSong } from "@/server/services/admin/songs";
import { DrizzleSongRepository } from "@/server/repositories/songs/song-repository.drizzle";
import { UpdateSongSchema } from "@/lib/types/api/admin/songs";
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
 * 曲名更新エンドポイント。
 * admin のみアクセス可。
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ songId: string }> }
) {
  return withApiHandler(async () => {
    const csrfError = verifyCsrfToken(request);
    if (csrfError) return csrfError;

    const { error } = await requireAdmin();
    if (error) return error;

    const { songId } = await params;
    const body = await request.json();
    const parsed = UpdateSongSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return NextResponse.json({ message: "入力内容に誤りがあります", errors }, { status: 400 });
    }

    const repo = new DrizzleSongRepository();
    const result = await updateSong(repo, songId, parsed.data);

    if (result.status === "not-found") {
      return NextResponse.json({ message: "曲が見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ song: result.song });
  });
}

/**
 * 曲マスタ削除エンドポイント。
 * admin のみアクセス可。イベントで使用中の曲を削除した場合、そのイベントへの登録・
 * エントリー（予約）もあわせて削除される。
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ songId: string }> }
) {
  return withApiHandler(async () => {
    const csrfError = verifyCsrfToken(request);
    if (csrfError) return csrfError;

    const { error } = await requireAdmin();
    if (error) return error;

    const { songId } = await params;
    const repo = new DrizzleSongRepository();
    const result = await deleteSong(repo, songId);

    if (result.status === "not-found") {
      return NextResponse.json({ message: "曲が見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ message: "曲を削除しました" });
  });
}
