import type { Event } from "@/lib/types/domain/events";
import { EventCard } from "./EventCard";
import { PastEventsAccordion } from "./PastEventsAccordion";

/**
 * イベント一覧を表示するコンポーネント。
 * 開催予定と開催終了（アコーディオン）のセクションに分けて表示する。
 */
export function EventList({ events }: { events: Event[] }) {
  const now = new Date().toISOString();
  const open = events.filter((e) => e.endAt > now);
  const closed = events.filter((e) => e.endAt <= now);

  if (open.length === 0 && closed.length === 0) {
    return <p className="text-sm text-muted-foreground">まだイベントはありません</p>;
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-4">開催予定</h2>
        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだイベントはありません</p>
        ) : (
          <div className="space-y-3">
            {open.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      <PastEventsAccordion events={closed} />
    </div>
  );
}
