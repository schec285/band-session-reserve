import { notFound } from "next/navigation";
import { DrizzleAdminEventRepository } from "@/server/repositories/admin/event-repository.drizzle";
import { getEventForEdit } from "@/server/services/admin/events";
import { TransitionLink } from "@/components/layout/TransitionLink";
import { PageReady } from "@/components/layout/PageTransition";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AdminEventDeleteButton } from "@/features/admin/events/AdminEventDeleteButton";
import { AdminEventInfoSection } from "@/features/admin/events/AdminEventInfoSection";
import { AdminEventSongsSection } from "@/features/admin/songs/AdminEventSongsSection";
import { PartBadgeList } from "@/components/PartBadgeList";
import { AdminCollectionButton } from "@/features/admin/events/AdminCollectionButton";
import { DrizzleSongRepository } from "@/server/repositories/songs/song-repository.drizzle";
import { getAllSongs } from "@/server/services/admin/songs";

/**
 * 管理者用イベント詳細ページ。
 * 「イベント情報」「登録曲」はそれぞれのセクション右上の編集アイコンからインライン編集できる。
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

  const songRepo = new DrizzleSongRepository();
  const allSongs = await getAllSongs(songRepo);

  return (
    <div className="space-y-6">
      <PageReady />
      <div className="space-y-1">
        <TransitionLink href="/admin/events" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-3")}>
          ← 一覧へ
        </TransitionLink>
        <h1 className="text-2xl font-bold">イベント詳細</h1>
      </div>

      <AdminEventInfoSection event={event} entrantsCount={entrants.length} />

      <AdminEventSongsSection eventId={eventId} eventSongs={songs} allSongs={allSongs} />

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
                <th className="pb-2 pr-4 font-medium">パート</th>
                <th className="pb-2 font-medium">徴収</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...entrants]
                .sort((a, b) => a.username.localeCompare(b.username, "ja"))
                .map(({ userId, username, parts, collected }, index) => (
                  <tr key={userId}>
                    <td className="py-2 pr-4 text-muted-foreground tabular-nums">{index + 1}</td>
                    <td className="py-2 pr-4 font-medium whitespace-nowrap">{username}</td>
                    <td className="py-2 pr-4">
                      <PartBadgeList parts={parts.map((p) => ({ part: p, entered: true }))} />
                    </td>
                    <td className="py-2">
                      <AdminCollectionButton eventId={eventId} userId={userId} collected={collected} />
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
