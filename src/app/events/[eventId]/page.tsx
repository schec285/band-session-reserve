import { notFound } from "next/navigation";
import { Calendar, Clock, MapPin, Ticket } from "lucide-react";
import { auth } from "@/auth";
import { getEventSongs } from "@/server/services/events/events";
import { DrizzleEventRepository } from "@/server/repositories/events/event-repository.drizzle";
import { SongList } from "@/features/events/SongList";
import { formatDate, formatTime } from "@/lib/utils/date";
import { EventStatusBadge, getEventStatus } from "@/components/EventStatusBadge";

/**
 * イベント詳細ページ。イベント情報と曲一覧・パート別予約状況を表示する。
 */
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const session = await auth();
  const repo = new DrizzleEventRepository();
  const result = await getEventSongs(repo, eventId, session?.user?.id);

  if (result.status === "not-found") notFound();

  const { event, songs } = result;
  const status = getEventStatus(event);

  const now = new Date();
  const isEntryClosed =
    (event.closedAt != null && now > new Date(event.closedAt)) ||
    now > new Date(event.startAt);

  return (
    <div className="space-y-6">
      <a href="/" className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1">
        ← イベント一覧に戻る
      </a>

      {/* イベント情報カード */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* ヘッダー帯 */}
        <div className={`px-6 py-4 ${status === "upcoming" ? "bg-blue-50 border-b border-blue-100" : "bg-muted/40 border-b border-border"}`}>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold leading-snug">{event.title}</h1>
            <EventStatusBadge status={status} />
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
          <div className="flex items-center gap-3 text-muted-foreground">
            <Ticket className="w-4 h-4 shrink-0" />
            <span className="font-medium text-foreground">参加費 {event.participationFee.toLocaleString()}円</span>
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
        <SongList
          songs={songs}
          isClosed={isEntryClosed}
          vocalEntryLimit={event.vocalEntryLimit}
          instrumentEntryLimit={event.instrumentEntryLimit}
          participationFee={event.participationFee}
        />
      </div>
    </div>
  );
}
