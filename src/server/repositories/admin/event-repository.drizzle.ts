import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, eventSongs, songs, reservations, users } from "@drizzle/schema";
import type { IAdminEventRecord, IAdminCreateEventInput, IAdminEventRepository, IAdminSongWithReservations } from "./event-repository";

const adminEventFields = {
  id: events.id,
  title: events.title,
  startAt: events.startAt,
  endAt: events.endAt,
  closedAt: events.closedAt,
  venue: events.venue,
  venueFee: events.venueFee,
  description: events.description,
} as const;

/**
 * Drizzle ORM を使った IAdminEventRepository の実装。
 * venueFee を含む管理者専用のイベント操作を提供する。
 */
export class DrizzleAdminEventRepository implements IAdminEventRepository {
  /**
   * 全イベントを取得する。
   * 並び順はサービス層で制御するため、ここでは順序を保証しない。
   */
  async findAllEvents(): Promise<IAdminEventRecord[]> {
    return db.select(adminEventFields).from(events);
  }

  /**
   * イベントIDで1件取得する。存在しない場合は null を返す。
   */
  async findEventById(eventId: string): Promise<IAdminEventRecord | null> {
    const rows = await db
      .select(adminEventFields)
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * イベントIDで曲一覧とパート別予約状況を取得する。
   * events を起点に LEFT JOIN することでイベントの存在有無を判別する。
   * イベントが存在しない場合は null、曲が 0 件の場合は空配列を返す。
   */
  async findEventSongsWithReservations(eventId: string): Promise<IAdminSongWithReservations[] | null> {
    const songRows = await db
      .select({
        eventSongId: eventSongs.id,
        songId: songs.id,
        title: songs.title,
        artist: songs.artist,
        parts: eventSongs.parts,
      })
      .from(events)
      .leftJoin(eventSongs, eq(eventSongs.eventId, events.id))
      .leftJoin(songs, eq(eventSongs.songId, songs.id))
      .where(eq(events.id, eventId));

    if (songRows.length === 0) return null;

    const validSongRows = songRows.filter(
      (r): r is typeof r & { eventSongId: string; songId: string; title: string; artist: string; parts: string[] } =>
        r.eventSongId !== null
    );
    if (validSongRows.length === 0) return [];

    const eventSongIds = validSongRows.map((r) => r.eventSongId);
    const reservationRows = await db
      .select({
        eventSongId: reservations.eventSongId,
        part: reservations.part,
        username: users.name,
      })
      .from(reservations)
      .innerJoin(users, eq(reservations.userId, users.id))
      .where(inArray(reservations.eventSongId, eventSongIds));

    return validSongRows.map((songRow) => {
      const songReservations = reservationRows.filter((r) => r.eventSongId === songRow.eventSongId);
      const reservationList = songRow.parts.map((part) => {
        const existing = songReservations.find((r) => r.part === part);
        return { part, username: existing?.username ?? null };
      });
      return {
        id: songRow.songId,
        eventSongId: songRow.eventSongId,
        title: songRow.title,
        artist: songRow.artist,
        reservations: reservationList,
      };
    });
  }

  /**
   * イベントを作成し、作成したレコードを返す。
   */
  async createEvent(input: IAdminCreateEventInput): Promise<IAdminEventRecord> {
    const rows = await db
      .insert(events)
      .values({
        title: input.title,
        startAt: input.startAt,
        endAt: input.endAt,
        closedAt: input.closedAt,
        venue: input.venue,
        venueFee: input.venueFee,
        description: input.description,
      })
      .returning(adminEventFields);

    return rows[0];
  }

  /**
   * イベントを更新し、更新後のレコードを返す。存在しない場合は null を返す。
   */
  async updateEvent(eventId: string, input: IAdminCreateEventInput): Promise<IAdminEventRecord | null> {
    const rows = await db
      .update(events)
      .set({
        title: input.title,
        startAt: input.startAt,
        endAt: input.endAt,
        closedAt: input.closedAt,
        venue: input.venue,
        venueFee: input.venueFee,
        description: input.description,
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId))
      .returning(adminEventFields);

    return rows[0] ?? null;
  }

  /**
   * イベントを削除する。存在しない場合は false を返す。
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    const rows = await db
      .delete(events)
      .where(eq(events.id, eventId))
      .returning({ id: events.id });

    return rows.length > 0;
  }
}
