import { cn } from "@/lib/utils";

export type EventStatus = "upcoming" | "closed" | "ended";

/**
 * イベントの日時情報からステータスを判定する。
 * - ended  : 現在時刻が endAt を過ぎている
 * - closed : 現在時刻が closedAt を過ぎている（endAt はまだ）
 * - upcoming: それ以外（募集中）
 */
export function getEventStatus(event: {
  endAt: string;
  closedAt?: string | null;
}): EventStatus {
  const now = new Date();
  if (now > new Date(event.endAt)) return "ended";
  if (event.closedAt && now > new Date(event.closedAt)) return "closed";
  return "upcoming";
}

const LABEL: Record<EventStatus, string> = {
  upcoming: "募集中",
  closed: "受付終了",
  ended: "終了",
};

const CLASS: Record<EventStatus, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  closed: "bg-yellow-100 text-yellow-700",
  ended: "bg-muted text-muted-foreground",
};

/**
 * イベントのステータスを示すバッジコンポーネント。
 * getEventStatus() で算出したステータスを渡す。
 */
export function EventStatusBadge({
  status,
  className,
}: {
  status: EventStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "shrink-0 text-xs font-medium px-2.5 py-1 rounded-full",
        CLASS[status],
        className
      )}
    >
      {LABEL[status]}
    </span>
  );
}
