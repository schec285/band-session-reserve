import Link from "next/link";
import { getEvents } from "@/server/services/events/events";
import { DrizzleEventRepository } from "@/server/repositories/events/event-repository.drizzle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AdminEventActions } from "@/features/admin/events/AdminEventActions";
import { EventStatusBadge, getEventStatus } from "@/components/EventStatusBadge";

/**
 * 日付を「YYYY年M月D日 HH:mm」形式にフォーマットする。
 */
function formatDatetime(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}年${mo}月${day}日 ${h}:${mi}`;
}

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
              <div
                key={event.id}
                className="flex flex-col gap-3 p-4 border rounded-lg sm:flex-row sm:items-center sm:justify-between sm:gap-0"
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
                <AdminEventActions eventId={event.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
