import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { songs, eventSongs } from "@drizzle/schema";
import type {
  ISongRecord,
  IEventSongRecord,
  ICreateSongInput,
  IAddEventSongInput,
  ISongRepository,
} from "./song-repository";

/**
 * Drizzle ORM を使った ISongRepository の実装。
 */
export class DrizzleSongRepository implements ISongRepository {
  /**
   * 全曲マスタを取得する。
   */
  async findAllSongs(): Promise<ISongRecord[]> {
    return await db
      .select({ id: songs.id, title: songs.title, artist: songs.artist })
      .from(songs);
  }

  /**
   * 曲IDで1件取得する。存在しない場合は null を返す。
   */
  async findSongById(songId: string): Promise<ISongRecord | null> {
    const rows = await db
      .select({ id: songs.id, title: songs.title, artist: songs.artist })
      .from(songs)
      .where(eq(songs.id, songId))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * 曲マスタを作成し、作成したレコードを返す。
   */
  async createSong(input: ICreateSongInput): Promise<ISongRecord> {
    const rows = await db
      .insert(songs)
      .values({ title: input.title, artist: input.artist })
      .returning({ id: songs.id, title: songs.title, artist: songs.artist });

    return rows[0];
  }

  /**
   * イベントに曲を追加し、作成したレコードを返す。
   */
  async addEventSong(input: IAddEventSongInput): Promise<IEventSongRecord> {
    const rows = await db
      .insert(eventSongs)
      .values({
        eventId: input.eventId,
        songId: input.songId,
        parts: input.parts,
      })
      .returning({
        eventSongId: eventSongs.id,
        songId: eventSongs.songId,
        parts: eventSongs.parts,
      });

    const song = await this.findSongById(input.songId);

    return {
      eventSongId: rows[0].eventSongId,
      songId: rows[0].songId,
      title: song!.title,
      artist: song!.artist,
      parts: rows[0].parts,
    };
  }

  /**
   * イベント曲IDでイベント曲を削除する。存在しない場合は false を返す。
   */
  async deleteEventSong(eventSongId: string): Promise<boolean> {
    const rows = await db
      .delete(eventSongs)
      .where(eq(eventSongs.id, eventSongId))
      .returning({ id: eventSongs.id });

    return rows.length > 0;
  }
}
