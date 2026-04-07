import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Event } from "@/lib/types/api/events";

/**
 * toLocaleString はサーバー/クライアントで差異が出るため手動でフォーマットする。
 */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}年${m}月${day}日 ${hh}:${mm}`;
}

/**
 * イベントの開催ステータスを判定する。
 */
function getStatus(event: Event): "upcoming" | "ended" {
  return new Date() <= new Date(event.endAt) ? "upcoming" : "ended";
}

const STATUS_LABEL: Record<ReturnType<typeof getStatus>, string> = {
  upcoming: "募集中",
  ended: "終了",
};

const STATUS_CLASS: Record<ReturnType<typeof getStatus>, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  ended: "bg-muted text-muted-foreground",
};

/**
 * イベント 1 件のカード表示。
 * now は EventList/PastEventsAccordion からサーバー側で生成した ISO 文字列を受け取る。
 */
export function EventCard({ event }: { event: Event }) {
  const status = getStatus(event);

  return (
    <a href={`/events/${event.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{event.title}</CardTitle>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_CLASS[status]}`}>
              {STATUS_LABEL[status]}
            </span>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>{formatDate(event.startAt)}</p>
          <p>{event.venue}</p>
        </CardContent>
      </Card>
    </a>
  );
}
