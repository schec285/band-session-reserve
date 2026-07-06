import { eq, and, inArray, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { songs, eventSongs, eventSongParts, reservations } from "@drizzle/schema";
import type { Part } from "@drizzle/schema/enums";
import type {
  ISongRecord,
  IEventSongRecord,
  ICreateSongInput,
  IAddEventSongsInput,
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
   * イベントに複数曲を一括追加し、作成したレコード一覧を返す。
   * transaction 内で event_songs を bulk INSERT した後、全曲分の event_song_parts を bulk INSERT する。
   */
  async addEventSongs(input: IAddEventSongsInput): Promise<IEventSongRecord[]> {
    return await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(eventSongs)
        .values(input.songs.map((song) => ({ eventId: input.eventId, songId: song.songId })))
        .returning({ eventSongId: eventSongs.id, songId: eventSongs.songId });

      const partsRows = inserted.flatMap((row, i) =>
        input.songs[i].parts.map((part) => ({ eventSongId: row.eventSongId, part }))
      );
      await tx.insert(eventSongParts).values(partsRows);

      const songIds = input.songs.map((song) => song.songId);
      const songMasters = await tx
        .select({ id: songs.id, title: songs.title, artist: songs.artist })
        .from(songs)
        .where(inArray(songs.id, songIds));
      const songMasterById = new Map(songMasters.map((s) => [s.id, s]));

      return inserted.map((row, i) => {
        const master = songMasterById.get(row.songId)!;
        return {
          eventSongId: row.eventSongId,
          songId: row.songId,
          title: master.title,
          artist: master.artist,
          parts: input.songs[i].parts,
        };
      });
    });
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

  /**
   * 指定した eventSongId 群のうち eventId に属するものを一括削除し、削除できた eventSongId 一覧を返す。
   * eventId に属さない eventSongId は無視される。
   */
  async deleteEventSongs(eventId: string, eventSongIds: string[]): Promise<string[]> {
    const rows = await db
      .delete(eventSongs)
      .where(and(eq(eventSongs.eventId, eventId), inArray(eventSongs.id, eventSongIds)))
      .returning({ id: eventSongs.id });

    return rows.map((row) => row.id);
  }

  /**
   * イベント曲の指定パートのエントリー（予約）を削除する。募集パート自体（event_song_parts）は残す。
   * 存在しない場合は false を返す。
   */
  async removeReservation(eventSongId: string, part: Part): Promise<boolean> {
    const rows = await db
      .delete(reservations)
      .where(and(eq(reservations.eventSongId, eventSongId), eq(reservations.part, part)))
      .returning({ id: reservations.id });

    return rows.length > 0;
  }
}
