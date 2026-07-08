import { Suspense } from "react";
import { getAllSongs } from "@/server/services/admin/songs";
import { DrizzleSongRepository } from "@/server/repositories/songs/song-repository.drizzle";
import { ArtistSongAccordion } from "@/features/admin/songs/ArtistSongAccordion";
import { SongsCreatedToast } from "@/features/admin/songs/SongsCreatedToast";
import { TransitionLink } from "@/components/layout/TransitionLink";
import { PageReady } from "@/components/layout/PageTransition";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 管理者用曲マスタ一覧ページ。
 */
export default async function AdminSongsPage() {
  const repo = new DrizzleSongRepository();
  const songs = await getAllSongs(repo);

  return (
    <div>
      <PageReady />
      <Suspense fallback={null}>
        <SongsCreatedToast />
      </Suspense>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">曲管理</h1>
        <TransitionLink href="/admin/songs/new" className={cn(buttonVariants())}>
          曲を追加する
        </TransitionLink>
      </div>

      {songs.length === 0 ? (
        <p className="text-muted-foreground text-sm">曲が登録されていません。</p>
      ) : (
        <ArtistSongAccordion songs={songs} />
      )}
    </div>
  );
}
