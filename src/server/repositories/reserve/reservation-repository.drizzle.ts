import { eq, and, inArray, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { reservations, eventSongs, events } from "@drizzle/schema";
import type { IEventSongRecord, IReservationRecord, IReservationRepository } from "./reservation-repository";

/**
 * Drizzle ORM を使った IReservationRepository の実装。
 */
export class DrizzleReservationRepository implements IReservationRepository {
  /**
   * eventSongId でイベント曲とイベント情報を取得する。
   * 存在しない場合は null を返す。
   */
  async findEventSongWithEvent(eventSongId: string): Promise<IEventSongRecord | null> {
    const rows = await db
      .select({
        id: eventSongs.id,
        parts: eventSongs.parts,
        eventId: events.id,
        startAt: events.startAt,
        closedAt: events.closedAt,
        vocalEntryLimit: events.vocalEntryLimit,
        instrumentEntryLimit: events.instrumentEntryLimit,
      })
      .from(eventSongs)
      .innerJoin(events, eq(eventSongs.eventId, events.id))
      .where(eq(eventSongs.id, eventSongId));

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      parts: row.parts,
      event: {
        id: row.eventId,
        startAt: row.startAt,
        closedAt: row.closedAt,
        vocalEntryLimit: row.vocalEntryLimit,
        instrumentEntryLimit: row.instrumentEntryLimit,
      },
    };
  }

  /**
   * eventSongId とパートで既存の予約を検索する。
   * 存在しない場合は null を返す。
   */
  async findByEventSongIdAndPart(eventSongId: string, part: string): Promise<{ id: string } | null> {
    const rows = await db
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.eventSongId, eventSongId),
          eq(reservations.part, part as typeof reservations.part._.data)
        )
      );
    return rows[0] ?? null;
  }

  /**
   * userId と eventSongId でその曲における既存予約一覧を取得する。
   */
  async findByUserIdAndEventSongId(userId: string, eventSongId: string): Promise<IReservationRecord[]> {
    return db
      .select({
        id: reservations.id,
        userId: reservations.userId,
        eventSongId: reservations.eventSongId,
        part: reservations.part,
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.userId, userId),
          eq(reservations.eventSongId, eventSongId)
        )
      );
  }

  /**
   * ユーザーがあるイベント内で指定パート群に持つ予約数を返す。
   * エントリー数制限チェックに使用する。
   */
  async countByUserIdAndEventIdAndParts(userId: string, eventId: string, parts: string[]): Promise<number> {
    if (parts.length === 0) return 0;
    const rows = await db
      .select({ cnt: count() })
      .from(reservations)
      .innerJoin(eventSongs, eq(reservations.eventSongId, eventSongs.id))
      .where(
        and(
          eq(reservations.userId, userId),
          eq(eventSongs.eventId, eventId),
          inArray(reservations.part, parts as Array<typeof reservations.part._.data>)
        )
      );
    return Number(rows[0]?.cnt ?? 0);
  }

  /**
   * 予約IDで予約を取得する。
   * 存在しない場合は null を返す。
   */
  async findById(reservationId: string): Promise<IReservationRecord | null> {
    const rows = await db
      .select({
        id: reservations.id,
        userId: reservations.userId,
        eventSongId: reservations.eventSongId,
        part: reservations.part,
      })
      .from(reservations)
      .where(eq(reservations.id, reservationId));
    return rows[0] ?? null;
  }

  /**
   * 予約の譲渡可否を更新する。
   */
  async updateTransferable(reservationId: string, isTransferable: boolean): Promise<void> {
    await db
      .update(reservations)
      .set({ isTransferable, updatedAt: new Date() })
      .where(eq(reservations.id, reservationId));
  }

  /**
   * 予約を削除する。
   */
  async deleteById(reservationId: string): Promise<void> {
    await db.delete(reservations).where(eq(reservations.id, reservationId));
  }

  /**
   * 複数の予約をトランザクションで一括作成する。
   */
  async createMany(data: Array<{
    userId: string;
    eventSongId: string;
    part: string;
    snsConsent: boolean;
    isTransferable: boolean;
    comment?: string;
  }>): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.insert(reservations).values(
        data.map((d) => ({
          userId: d.userId,
          eventSongId: d.eventSongId,
          part: d.part as typeof reservations.part._.data,
          snsConsent: d.snsConsent,
          isTransferable: d.isTransferable,
          comment: d.comment,
        }))
      );
    });
  }

}
