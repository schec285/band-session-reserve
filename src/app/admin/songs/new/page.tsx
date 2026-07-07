import { getAllSongs } from "@/server/services/admin/songs";
import { DrizzleSongRepository } from "@/server/repositories/songs/song-repository.drizzle";
import { SongForm } from "@/features/admin/songs/SongForm";

/**
 * 曲マスタ新規作成ページ。
 */
export default async function NewSongPage() {
  const repo = new DrizzleSongRepository();
  const songs = await getAllSongs(repo);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">曲登録</h1>
      <SongForm songs={songs} />
    </div>
  );
}
