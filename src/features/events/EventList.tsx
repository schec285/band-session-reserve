import type { Event } from "@/lib/types/domain/events";
import { EventCard } from "./EventCard";
import { PastEventsAccordion } from "./PastEventsAccordion";

/**
 * イベント一覧を表示するコンポーネント。
 * 開催中・開催予定・開催終了（アコーディオン）のセクションに分けて表示する。
 * サービス層でソート済みのため、受け取った順序をそのまま描画する。
 */
export function EventList({ events }: { events: Event[] }) {
  const now = new Date();
  const ongoing = events.filter((e) => new Date(e.startAt) <= now && now <= new Date(e.endAt));
  const upcoming = events.filter((e) => new Date(e.startAt) > now);
  const ended = events.filter((e) => new Date(e.endAt) <= now);

  if (ongoing.length === 0 && upcoming.length === 0 && ended.length === 0) {
    return <p className="text-sm text-muted-foreground">まだイベントはありません</p>;
  }

  return (
    <div className="space-y-8">
      {ongoing.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">開催中</h2>
          <div className="space-y-3">
            {ongoing.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-4">開催予定</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだイベントはありません</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      <PastEventsAccordion events={ended} />
    </div>
  );
}
