import { notFound } from "next/navigation";
import { getEventSongs } from "@/server/services/events/events";
import { DrizzleEventRepository } from "@/server/repositories/events/event-repository.drizzle";
import { SongList } from "@/features/events/SongList";

/**
 * イベント詳細ページ。曲一覧とパート別予約状況を表示する。
 */
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const repo = new DrizzleEventRepository();
  const result = await getEventSongs(repo, eventId);

  if (result.status === "not-found") notFound();

  return (
    <div>
      <a href="/" className="text-sm text-muted-foreground hover:underline mb-6 inline-block">
        ← イベント一覧に戻る
      </a>
      <h1 className="text-2xl font-bold mb-6">曲一覧</h1>
      <SongList songs={result.songs} />
    </div>
  );
}
