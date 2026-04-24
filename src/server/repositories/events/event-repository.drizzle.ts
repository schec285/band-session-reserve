import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, eventSongs, eventSongParts, songs, reservations, users } from "@drizzle/schema";
import type { IEventRecord, ISongWithReservations, IEventRepository } from "./event-repository";

/**
 * Drizzle ORM を使った IEventRepository の実装。
 * 一般ユーザー向けの読み取り専用操作のみを提供する。
 */
export class DrizzleEventRepository implements IEventRepository {
  /**
   * 全イベントを取得する。
   * 並び順はサービス層で制御するため、ここでは順序を保証しない。
   */
  async findAllEvents(): Promise<IEventRecord[]> {
    return db
      .select({
        id: events.id,
        title: events.title,
        startAt: events.startAt,
        endAt: events.endAt,
        closedAt: events.closedAt,
        venue: events.venue,
        participationFee: events.participationFee,
        description: events.description,
        vocalEntryLimit: events.vocalEntryLimit,
        instrumentEntryLimit: events.instrumentEntryLimit,
      })
      .from(events);
  }

  /**
   * イベントIDで1件取得する。存在しない場合は null を返す。
   */
  async findEventById(eventId: string): Promise<IEventRecord | null> {
    const rows = await db
      .select({
        id: events.id,
        title: events.title,
        startAt: events.startAt,
        endAt: events.endAt,
        closedAt: events.closedAt,
        venue: events.venue,
        participationFee: events.participationFee,
        description: events.description,
        vocalEntryLimit: events.vocalEntryLimit,
        instrumentEntryLimit: events.instrumentEntryLimit,
      })
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
  async findEventSongsWithReservations(eventId: string): Promise<ISongWithReservations[] | null> {
    // クエリ 1: イベントの存在確認 + 曲一覧を取得
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

    // イベントが存在しない場合
    if (songRows.length === 0) return null;

    // イベントが存在するが曲が 0 件の場合
    const validSongRows = songRows.filter(
      (r): r is typeof r & { eventSongId: string; songId: string; title: string; artist: string } =>
        r.eventSongId !== null
    );
    if (validSongRows.length === 0) return [];

    const eventSongIds = validSongRows.map((r) => r.eventSongId);

    // クエリ 2: 募集パートを event_song_parts から取得
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

    // クエリ 3: 対象 event_songs の予約一覧（username・userId 付き）を取得
    const reservationRows = await db
      .select({
        reservationId: reservations.id,
        eventSongId: reservations.eventSongId,
        part: reservations.part,
        username: users.name,
        userId: reservations.userId,
        isTransferable: reservations.isTransferable,
      })
      .from(reservations)
      .innerJoin(users, eq(reservations.userId, users.id))
      .where(inArray(reservations.eventSongId, eventSongIds));

    // parts 配列を展開し、予約状況をマージして返す
    return validSongRows.map((songRow) => {
      const parts = partsByEventSongId.get(songRow.eventSongId) ?? [];
      const songReservations = reservationRows.filter((r) => r.eventSongId === songRow.eventSongId);

      const reservationList = parts.map((part) => {
        const existing = songReservations.find((r) => r.part === part);
        return {
          part,
          username: existing?.username ?? null,
          userId: existing?.userId ?? null,
          reservationId: existing?.reservationId ?? null,
          isTransferable: existing?.isTransferable ?? false,
        };
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
}
