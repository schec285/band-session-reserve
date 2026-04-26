import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, eventSongs, eventSongParts, songs, reservations, users, eventCollections } from "@drizzle/schema";
import type { IAdminEventRecord, IAdminCreateEventInput, IAdminEventRepository, IAdminSongWithReservations } from "./event-repository";

const adminEventFields = {
  id: events.id,
  title: events.title,
  startAt: events.startAt,
  endAt: events.endAt,
  closedAt: events.closedAt,
  venue: events.venue,
  venueFee: events.venueFee,
  participationFee: events.participationFee,
  description: events.description,
  vocalEntryLimit: events.vocalEntryLimit,
  instrumentEntryLimit: events.instrumentEntryLimit,
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
      })
      .from(events)
      .leftJoin(eventSongs, eq(eventSongs.eventId, events.id))
      .leftJoin(songs, eq(eventSongs.songId, songs.id))
      .where(eq(events.id, eventId));

    if (songRows.length === 0) return null;

    const validSongRows = songRows.filter(
      (r): r is typeof r & { eventSongId: string; songId: string; title: string; artist: string } =>
        r.eventSongId !== null
    );
    if (validSongRows.length === 0) return [];

    const eventSongIds = validSongRows.map((r) => r.eventSongId);

    const partRows = await db
      .select({ eventSongId: eventSongParts.eventSongId, part: eventSongParts.part })
      .from(eventSongParts)
      .where(inArray(eventSongParts.eventSongId, eventSongIds));

    const partsByEventSongId = new Map<string, string[]>();
    for (const r of partRows) {
      const list = partsByEventSongId.get(r.eventSongId) ?? [];
      list.push(r.part);
      partsByEventSongId.set(r.eventSongId, list);
    }

    const reservationRows = await db
      .select({
        eventSongId: reservations.eventSongId,
        part: reservations.part,
        username: users.name,
        userId: users.id,
      })
      .from(reservations)
      .innerJoin(users, eq(reservations.userId, users.id))
      .where(inArray(reservations.eventSongId, eventSongIds));

    return validSongRows.map((songRow) => {
      const parts = partsByEventSongId.get(songRow.eventSongId) ?? [];
      const songReservations = reservationRows.filter((r) => r.eventSongId === songRow.eventSongId);
      const reservationList = parts.map((part) => {
        const existing = songReservations.find((r) => r.part === part);
        return { part, username: existing?.username ?? null, userId: existing?.userId ?? null };
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
   * イベントの徴収済みユーザーIDセットを返す。
   */
  async findCollectedUserIds(eventId: string): Promise<Set<string>> {
    const rows = await db
      .select({ userId: eventCollections.userId })
      .from(eventCollections)
      .where(eq(eventCollections.eventId, eventId));

    return new Set(rows.map((r) => r.userId));
  }

  /**
   * 徴収状況を更新する。
   * collected: true → 行を upsert（既存なら何もしない）
   * collected: false → 行を削除
   * イベントが存在しない場合は false を返す。
   */
  async setCollected(eventId: string, userId: string, collected: boolean): Promise<boolean> {
    const eventExists = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (eventExists.length === 0) return false;

    if (collected) {
      await db
        .insert(eventCollections)
        .values({ eventId, userId })
        .onConflictDoNothing();
    } else {
      await db
        .delete(eventCollections)
        .where(and(eq(eventCollections.eventId, eventId), eq(eventCollections.userId, userId)));
    }

    return true;
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
        participationFee: input.participationFee,
        description: input.description,
        vocalEntryLimit: input.vocalEntryLimit,
        instrumentEntryLimit: input.instrumentEntryLimit,
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
        participationFee: input.participationFee,
        description: input.description,
        vocalEntryLimit: input.vocalEntryLimit,
        instrumentEntryLimit: input.instrumentEntryLimit,
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
