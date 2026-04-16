import { cn } from "@/lib/utils";

export type EventStatus = "upcoming" | "ongoing" | "closed" | "ended";

/**
 * イベントの日時情報からステータスを判定する。
 * - ended  : 現在時刻が endAt を過ぎている
 * - ongoing : 現在時刻が startAt 以上かつ endAt 以下（開催中）
 * - closed : 現在時刻が closedAt を過ぎている（endAt はまだ、startAt 未満）
 * - upcoming: それ以外（募集中）
 */
export function getEventStatus(event: {
  startAt: string;
  endAt: string;
  closedAt?: string | null;
}): EventStatus {
  const now = new Date();
  if (now > new Date(event.endAt)) return "ended";
  if (now >= new Date(event.startAt)) return "ongoing";
  if (event.closedAt && now > new Date(event.closedAt)) return "closed";
  return "upcoming";
}

const LABEL: Record<EventStatus, string> = {
  upcoming: "募集中",
  ongoing: "開催中",
  closed: "受付終了",
  ended: "終了",
};

const CLASS: Record<EventStatus, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  ongoing: "bg-green-100 text-green-700",
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
