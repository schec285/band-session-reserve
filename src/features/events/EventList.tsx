import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Event } from "@/lib/types/api/events";

/**
 * イベント一覧を表示するコンポーネント。
 * 募集中イベントと終了済みイベントをセクションに分けて表示する。
 */
export function EventList({ events }: { events: Event[] }) {
  const now = new Date().toISOString();
  const open = events.filter((e) => (e.closedAt ?? e.startAt) > now);
  const closed = events.filter((e) => (e.closedAt ?? e.startAt) <= now);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-4">募集中</h2>
        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground">募集中のイベントはありません</p>
        ) : (
          <div className="space-y-3">
            {open.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {closed.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 text-muted-foreground">終了済み</h2>
          <div className="space-y-3">
            {closed.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * イベント 1 件のカード表示。
 */
function EventCard({ event }: { event: Event }) {
  const startAt = new Date(event.startAt).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <a href={`/events/${event.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{event.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>{startAt}</p>
          <p>{event.venue}</p>
        </CardContent>
      </Card>
    </a>
  );
}
