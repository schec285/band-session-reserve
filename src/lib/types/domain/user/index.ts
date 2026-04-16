/**
 * マイ予約一覧の1件を表す型。
 * 日時フィールドは ISO 8601 文字列。
 */
export type MyReservationItem = {
  reservationId: string;
  event: { id: string; title: string; startAt: string; venue: string };
  song: { title: string; artist: string };
  part: string;
  isTransferable: boolean;
  createdAt: string;
};
