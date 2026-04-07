import { notFound } from "next/navigation";
import { Calendar, Clock, MapPin } from "lucide-react";
import { getEventSongs } from "@/server/services/events/events";
import { DrizzleEventRepository } from "@/server/repositories/events/event-repository.drizzle";
import { SongList } from "@/features/events/SongList";
import { formatDate, formatTime } from "@/lib/utils/date";

/**
 * イベント詳細ページ。イベント情報と曲一覧・パート別予約状況を表示する。
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

  const { event, songs } = result;
  const isUpcoming = new Date() <= new Date(event.endAt);

  return (
    <div className="space-y-6">
      <a href="/" className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1">
        ← イベント一覧に戻る
      </a>

      {/* イベント情報カード */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* ヘッダー帯 */}
        <div className={`px-6 py-4 ${isUpcoming ? "bg-blue-50 border-b border-blue-100" : "bg-muted/40 border-b border-border"}`}>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold leading-snug">{event.title}</h1>
            <span className={`shrink-0 text-xs font-medium px-3 py-1 rounded-full ${isUpcoming ? "bg-blue-500 text-white" : "bg-muted-foreground/20 text-muted-foreground"}`}>
              {isUpcoming ? "募集中" : "終了"}
            </span>
          </div>
        </div>

        {/* 詳細情報 */}
        <div className="px-6 py-4 space-y-3 text-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="font-medium text-foreground">{formatDate(event.startAt)}</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Clock className="w-4 h-4 shrink-0" />
            <span className="font-medium text-foreground">{formatTime(event.startAt)}〜{formatTime(event.endAt)}</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="font-medium text-foreground">{event.venue}</span>
          </div>
          {event.description && (
            <p className="pt-2 text-muted-foreground border-t border-border leading-relaxed">
              {event.description}
            </p>
          )}
        </div>
      </div>

      {/* 曲一覧 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">曲一覧</h2>
        <SongList songs={songs} />
      </div>
    </div>
  );
}
