import { NextResponse } from "next/server";
import { getEvents } from "@/server/services/events/events";
import { DrizzleEventRepository } from "@/server/repositories/events/event-repository.drizzle";

/**
 * イベント一覧取得エンドポイント。
 * 認証不要。募集中イベントを先頭に、終了済みイベントをその後に返す。
 */
export async function GET(_request: Request) {
  const repo = new DrizzleEventRepository();
  const events = await getEvents(repo);
  return NextResponse.json({ events });
}
