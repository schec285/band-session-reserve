import { getAllSongs } from "@/server/services/admin/songs";
import { DrizzleSongRepository } from "@/server/repositories/songs/song-repository.drizzle";
import { AdminSongList } from "@/features/admin/songs/AdminSongList";

/**
 * 管理者用曲マスタ一覧ページ。
 */
export default async function AdminSongsPage() {
  const repo = new DrizzleSongRepository();
  const songs = await getAllSongs(repo);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">曲管理</h1>
      <AdminSongList songs={songs} />
    </div>
  );
}
