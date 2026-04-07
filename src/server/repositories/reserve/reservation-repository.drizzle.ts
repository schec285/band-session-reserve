import { eq, and } from "drizzle-orm";
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
        startAt: events.startAt,
        closedAt: events.closedAt,
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
        startAt: row.startAt,
        closedAt: row.closedAt,
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
   * 予約のパートを更新する。
   */
  async updatePart(reservationId: string, part: string): Promise<void> {
    await db
      .update(reservations)
      .set({ part: part as typeof reservations.part._.data, updatedAt: new Date() })
      .where(eq(reservations.id, reservationId));
  }

  /**
   * 予約を削除する。
   */
  async deleteById(reservationId: string): Promise<void> {
    await db.delete(reservations).where(eq(reservations.id, reservationId));
  }

  /**
   * 予約を新規作成する。
   */
  async create(data: {
    userId: string;
    eventSongId: string;
    part: string;
    snsConsent: boolean;
    comment?: string;
  }): Promise<void> {
    await db.insert(reservations).values({
      userId: data.userId,
      eventSongId: data.eventSongId,
      part: data.part as typeof reservations.part._.data,
      snsConsent: data.snsConsent,
      comment: data.comment,
    });
  }
}
