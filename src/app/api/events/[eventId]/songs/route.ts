import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getEventSongs } from "@/server/services/events/events";
import { DrizzleEventRepository } from "@/server/repositories/events/event-repository.drizzle";

/**
 * イベントの曲一覧・予約状況取得エンドポイント。
 * 認証不要。ログイン中の場合は自分の予約に isOwner: true を付与する。
 * 指定イベントが存在しない場合は 404 を返す。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const session = await auth();
  const repo = new DrizzleEventRepository();
  const result = await getEventSongs(repo, eventId, session?.user?.id);

  if (result.status === "not-found") {
    return NextResponse.json({ message: "イベントが見つかりません" }, { status: 404 });
  }

  return NextResponse.json({ songs: result.songs });
}
