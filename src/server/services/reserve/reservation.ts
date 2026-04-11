import type { IReservationRepository } from "@/server/repositories/reserve/reservation-repository";
import { FORBIDDEN_SAME_SONG_PAIRS } from "@/lib/utils/parts";

type CreateReservationsResult =
  | { status: "ok" }
  | { status: "not-found" }
  | { status: "filled" }
  | { status: "closed" }
  | { status: "forbidden-combination" };

/**
 * 複数の予約を一括作成する。
 * 全エントリーのバリデーション（存在確認・受付状況・空き確認）を先に行い、
 * 1件でも失敗した場合は全件キャンセルする。全件通過後に createMany で一括保存する。
 */
export async function createReservations(
  repo: IReservationRepository,
  params: {
    userId: string;
    entries: Array<{ eventSongId: string; part: string; isTransferable: boolean }>;
    snsConsent: boolean;
    comment?: string;
  }
): Promise<CreateReservationsResult> {
  for (const entry of params.entries) {
    const eventSong = await repo.findEventSongWithEvent(entry.eventSongId);
    if (!eventSong) return { status: "not-found" };

    const deadline = eventSong.event.closedAt ?? eventSong.event.startAt;
    if (deadline <= new Date()) return { status: "closed" };

    const existingByUser = await repo.findByUserIdAndEventSongId(params.userId, entry.eventSongId);
    const hasForbidden = existingByUser.some((r) =>
      FORBIDDEN_SAME_SONG_PAIRS.some(
        ([a, b]) => (r.part === a && entry.part === b) || (r.part === b && entry.part === a)
      )
    );
    if (hasForbidden) return { status: "forbidden-combination" };

    const existing = await repo.findByEventSongIdAndPart(entry.eventSongId, entry.part);
    if (existing) return { status: "filled" };
  }

  await repo.createMany(
    params.entries.map((entry) => ({
      userId: params.userId,
      eventSongId: entry.eventSongId,
      part: entry.part,
      snsConsent: params.snsConsent,
      isTransferable: entry.isTransferable,
      comment: params.comment,
    }))
  );

  return { status: "ok" };
}

type UpdateReservationPartResult =
  | { status: "ok" }
  | { status: "not-found" }
  | { status: "forbidden" }
  | { status: "filled" }
  | { status: "closed" };

/**
 * 予約のパートを変更する。
 * 予約の存在確認・所有権確認・受付状況・パートの空き確認を行い、更新する。
 */
export async function updateReservationPart(
  repo: IReservationRepository,
  params: {
    reservationId: string;
    userId: string;
    part: string;
    isTransferable: boolean;
  }
): Promise<UpdateReservationPartResult> {
  const reservation = await repo.findById(params.reservationId);
  if (!reservation) return { status: "not-found" };
  if (reservation.userId !== params.userId) return { status: "forbidden" };

  const eventSong = await repo.findEventSongWithEvent(reservation.eventSongId);
  if (!eventSong) return { status: "not-found" };

  const deadline = eventSong.event.closedAt ?? eventSong.event.startAt;
  if (deadline <= new Date()) return { status: "closed" };

  const existing = await repo.findByEventSongIdAndPart(reservation.eventSongId, params.part);
  if (existing) return { status: "filled" };

  await repo.updatePartAndTransferable(params.reservationId, params.part, params.isTransferable);
  return { status: "ok" };
}

type CancelReservationResult =
  | { status: "ok" }
  | { status: "not-found" }
  | { status: "forbidden" }
  | { status: "closed" };

/**
 * 予約をキャンセルする。
 * 予約の存在確認・所有権確認・受付状況を確認し、予約レコードを削除する。
 */
export async function cancelReservation(
  repo: IReservationRepository,
  params: {
    reservationId: string;
    userId: string;
  }
): Promise<CancelReservationResult> {
  const reservation = await repo.findById(params.reservationId);
  if (!reservation) return { status: "not-found" };
  if (reservation.userId !== params.userId) return { status: "forbidden" };

  const eventSong = await repo.findEventSongWithEvent(reservation.eventSongId);
  if (!eventSong) return { status: "not-found" };

  const deadline = eventSong.event.closedAt ?? eventSong.event.startAt;
  if (deadline <= new Date()) return { status: "closed" };

  await repo.deleteById(params.reservationId);
  return { status: "ok" };
}
