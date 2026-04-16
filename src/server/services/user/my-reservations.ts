import type { IReservationRepository } from "@/server/repositories/reserve/reservation-repository";
import type { MyReservationItem } from "@/lib/types/domain/user";

/**
 * ログイン中ユーザーの今後の予約一覧を取得する。
 * リポジトリから取得したレコードを MyReservationItem にマッピングし、
 * 日時フィールドを ISO 8601 文字列に変換して返す。
 */
export async function getMyReservations(
  repo: IReservationRepository,
  userId: string
): Promise<MyReservationItem[]> {
  const records = await repo.findUpcomingByUserId(userId);
  return records.map((r) => ({
    reservationId: r.reservationId,
    event: {
      id: r.event.id,
      title: r.event.title,
      startAt: r.event.startAt.toISOString(),
      venue: r.event.venue,
    },
    song: r.song,
    part: r.part,
    isTransferable: r.isTransferable,
    createdAt: r.createdAt.toISOString(),
  }));
}
