import { eq, and, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { songs, eventSongs, eventSongParts } from "@drizzle/schema";
import type { Part } from "@drizzle/schema/enums";
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
   * event_songs に INSERT した後、event_song_parts に募集パートを bulk INSERT する。
   */
  async addEventSong(input: IAddEventSongInput): Promise<IEventSongRecord> {
    const rows = await db
      .insert(eventSongs)
      .values({
        eventId: input.eventId,
        songId: input.songId,
      })
      .returning({
        eventSongId: eventSongs.id,
        songId: eventSongs.songId,
      });

    const eventSongId = rows[0].eventSongId;

    await db.insert(eventSongParts).values(
      input.parts.map((part) => ({ eventSongId, part }))
    );

    const song = await this.findSongById(input.songId);

    return {
      eventSongId,
      songId: rows[0].songId,
      title: song!.title,
      artist: song!.artist,
      parts: input.parts,
    };
  }

  /**
   * イベント曲の募集パートを更新する。存在しない場合は null を返す。
   * transaction 内で、削除パートの event_song_parts 行を DELETE（→ reservations cascade 削除）し、
   * 追加パートを INSERT する。
   */
  async updateEventSongParts(
    eventSongId: string,
    parts: Part[]
  ): Promise<{ eventSongId: string; parts: Part[] } | null> {
    const existing = await db
      .select({ id: eventSongs.id })
      .from(eventSongs)
      .where(eq(eventSongs.id, eventSongId))
      .limit(1);

    if (!existing[0]) return null;

    await db.transaction(async (tx) => {
      // 新リストにないパートを削除（→ reservations が cascade で自動削除される）
      await tx.delete(eventSongParts).where(
        and(
          eq(eventSongParts.eventSongId, eventSongId),
          notInArray(eventSongParts.part, parts)
        )
      );

      // 新規パートを追加（既存パートは ON CONFLICT DO NOTHING でスキップ）
      await tx.insert(eventSongParts)
        .values(parts.map((part) => ({ eventSongId, part })))
        .onConflictDoNothing();

      await tx.update(eventSongs)
        .set({ updatedAt: new Date() })
        .where(eq(eventSongs.id, eventSongId));
    });

    return { eventSongId, parts };
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
