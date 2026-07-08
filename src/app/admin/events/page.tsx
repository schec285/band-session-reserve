import Link from "next/link";
import { getEvents } from "@/server/services/events/events";
import { DrizzleEventRepository } from "@/server/repositories/events/event-repository.drizzle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EventStatusBadge, getEventStatus } from "@/components/EventStatusBadge";
import { formatDatetime } from "@/lib/utils/date";

/**
 * 管理者用イベント一覧ページ。
 */
export default async function AdminEventsPage() {
  const repo = new DrizzleEventRepository();
  const events = await getEvents(repo);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">イベント管理</h1>
        <Link href="/admin/events/new" className={cn(buttonVariants())}>
          新規作成
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="text-muted-foreground text-sm">イベントがありません。</p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const status = getEventStatus(event);
            return (
              <Link
                key={event.id}
                href={`/admin/events/${event.id}`}
                className="flex flex-col gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">{event.title}</p>
                    <EventStatusBadge status={status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{event.venue}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDatetime(event.startAt)}〜{formatDatetime(event.endAt)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
