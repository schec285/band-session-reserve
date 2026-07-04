import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { addEventSong } from "@/server/services/admin/songs";
import { DrizzleSongRepository } from "@/server/repositories/songs/song-repository.drizzle";
import { AddEventSongSchema } from "@/lib/types/api/admin/songs";
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
 * イベントへ曲追加エンドポイント。
 * admin のみアクセス可。
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return withApiHandler(async () => {
    const csrfError = verifyCsrfToken(request);
    if (csrfError) return csrfError;

    const { error } = await requireAdmin();
    if (error) return error;

    const { eventId } = await params;
    const body = await request.json();
    const parsed = AddEventSongSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return NextResponse.json({ message: "入力内容に誤りがあります", errors }, { status: 400 });
    }

    const repo = new DrizzleSongRepository();
    const result = await addEventSong(repo, eventId, parsed.data);

    return NextResponse.json({ eventSong: result.eventSong }, { status: 201 });
  });
}
