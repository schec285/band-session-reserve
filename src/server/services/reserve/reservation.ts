import type { IReservationRepository } from "@/server/repositories/reserve/reservation-repository";

type CreateReservationResult =
  | { status: "ok" }
  | { status: "not-found" }
  | { status: "filled" }
  | { status: "closed" };

/**
 * 予約を作成する。
 * イベント曲の存在確認・受付状況・パートの空き確認を行い、予約を保存する。
 */
export async function createReservation(
  repo: IReservationRepository,
  params: {
    userId: string;
    eventSongId: string;
    part: string;
    snsConsent: boolean;
    comment?: string;
  }
): Promise<CreateReservationResult> {
  const eventSong = await repo.findEventSongWithEvent(params.eventSongId);
  if (!eventSong) return { status: "not-found" };

  const deadline = eventSong.event.closedAt ?? eventSong.event.startAt;
  if (deadline <= new Date()) return { status: "closed" };

  const existing = await repo.findByEventSongIdAndPart(params.eventSongId, params.part);
  if (existing) return { status: "filled" };

  await repo.create({
    userId: params.userId,
    eventSongId: params.eventSongId,
    part: params.part,
    snsConsent: params.snsConsent,
    comment: params.comment,
  });

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

  await repo.updatePart(params.reservationId, params.part);
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
