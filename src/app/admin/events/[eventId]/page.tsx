import { notFound } from "next/navigation";
import Link from "next/link";
import { DrizzleAdminEventRepository } from "@/server/repositories/admin/event-repository.drizzle";
import { getEventForEdit } from "@/server/services/admin/events";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AdminEventDeleteButton } from "@/features/admin/events/AdminEventDeleteButton";
import { EventStatusBadge, getEventStatus } from "@/components/EventStatusBadge";
import { formatDatetime } from "@/lib/utils/date";
import { PartBadgeList } from "@/components/PartBadgeList";

/**
 * 管理者用イベント詳細ページ。
 * 編集ボタンを上部に、削除ボタンを下部に表示する。
 */
export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const repo = new DrizzleAdminEventRepository();
  const result = await getEventForEdit(repo, eventId);

  if (result.status === "not-found") notFound();

  const { event, songs, entrants } = result;
  const status = getEventStatus(event);

  const totalCollected = event.participationFee * entrants.length;
  const balance = totalCollected - event.venueFee;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin/events" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-3")}>
          ← 一覧へ
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">イベント詳細</h1>
          <Link
            href={`/admin/events/${eventId}/edit`}
            className={cn(buttonVariants())}
          >
            編集
          </Link>
        </div>
      </div>

      <div className="border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{event.title}</h2>
          <EventStatusBadge status={status} />
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-muted-foreground">会場</dt>
            <dd className="font-medium mt-0.5">{event.venue}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">開始日時</dt>
            <dd className="font-medium mt-0.5">{formatDatetime(event.startAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">終了日時</dt>
            <dd className="font-medium mt-0.5">{formatDatetime(event.endAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">受付締切日時</dt>
            <dd className="font-medium mt-0.5">
              {event.closedAt ? formatDatetime(event.closedAt) : "未設定"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">会場費</dt>
            <dd className="font-medium mt-0.5">{event.venueFee.toLocaleString()} 円</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">参加費</dt>
            <dd className="font-medium mt-0.5">{event.participationFee.toLocaleString()} 円</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">ボーカル系エントリー上限</dt>
            <dd className="font-medium mt-0.5">
              {event.vocalEntryLimit != null ? `${event.vocalEntryLimit} 枠` : "無制限"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">楽器系エントリー上限</dt>
            <dd className="font-medium mt-0.5">
              {event.instrumentEntryLimit != null ? `${event.instrumentEntryLimit} 枠` : "無制限"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">暫定徴収額</dt>
            <dd className="font-medium mt-0.5 flex items-baseline gap-2">
              <span>{totalCollected.toLocaleString("ja-JP")} 円</span>
              <span className={`text-sm ${balance > 0 ? "text-green-600" : balance < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                {balance > 0
                  ? `(+${balance.toLocaleString("ja-JP")} 円)`
                  : balance < 0
                    ? `(-${Math.abs(balance).toLocaleString("ja-JP")} 円)`
                    : "(収支ゼロ)"}
              </span>
            </dd>
          </div>
        </dl>

        {event.description && (
          <div>
            <p className="text-muted-foreground text-sm mb-1">説明</p>
            <p className="text-sm whitespace-pre-wrap">{event.description}</p>
          </div>
        )}
      </div>

      <div className="border rounded-lg p-6 space-y-3">
        <h2 className="font-semibold">登録曲</h2>
        {songs.length === 0 ? (
          <p className="text-muted-foreground text-sm">曲が登録されていません。</p>
        ) : (
          <div className="space-y-2">
            {songs.map((song) => (
              <div key={song.eventSongId} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{song.title}</p>
                  <p className="text-xs text-muted-foreground">{song.artist}</p>
                  <div className="mt-1">
                    <PartBadgeList parts={song.parts} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border rounded-lg p-6 space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">エントリー一覧</h2>
          <span className="text-sm text-muted-foreground">{entrants.length} 名</span>
        </div>
        {entrants.length === 0 ? (
          <p className="text-muted-foreground text-sm">エントリーはまだありません。</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium w-8">#</th>
                <th className="pb-2 pr-4 font-medium">ユーザ名</th>
                <th className="pb-2 font-medium">パート</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...entrants]
                .sort((a, b) => a.username.localeCompare(b.username, "ja"))
                .map(({ username, parts }, index) => (
                  <tr key={username}>
                    <td className="py-2 pr-4 text-muted-foreground tabular-nums">{index + 1}</td>
                    <td className="py-2 pr-4 font-medium whitespace-nowrap">{username}</td>
                    <td className="py-2">
                      <PartBadgeList parts={parts.map((p) => ({ part: p, entered: true }))} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border rounded-lg px-4 py-2">
        <AdminEventDeleteButton eventId={eventId} />
      </div>
    </div>
  );
}
