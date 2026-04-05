import { NextResponse } from "next/server";
import { getEventSongs } from "@/server/services/events/events";
import { DrizzleEventRepository } from "@/server/repositories/events/event-repository.drizzle";

/**
 * イベントの曲一覧・予約状況取得エンドポイント。
 * 認証不要。指定イベントが存在しない場合は 404 を返す。
 */
export async function GET(
  _request: Request,
  { params }: { params: { eventId: string } }
) {
  const repo = new DrizzleEventRepository();
  const result = await getEventSongs(repo, params.eventId);

  if (result.status === "not-found") {
    return NextResponse.json({ message: "イベントが見つかりません" }, { status: 404 });
  }

  return NextResponse.json({ songs: result.songs });
}
