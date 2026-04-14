/**
 * イベント1件を表す型。
 * 日時フィールドは ISO 8601 文字列。
 */
export type Event = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  closedAt: string | null;
  venue: string;
  participationFee: number;
  description: string;
  vocalEntryLimit: number | null;
  instrumentEntryLimit: number | null;
};

/**
 * パート別予約状況1件を表す型。
 * username が null の場合は空き、文字列の場合は予約済みを表す。
 * isOwner はログイン中ユーザー自身の予約かどうかを示す。
 */
export type ReservationInfo = {
  part: string;
  username: string | null;
  isOwner: boolean;
  reservationId: string | null;
  isTransferable: boolean;
};

/**
 * 予約状況付き曲1件を表す型。
 */
export type SongWithReservations = {
  id: string;
  eventSongId: string;
  title: string;
  artist: string;
  reservations: ReservationInfo[];
};
