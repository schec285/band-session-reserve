export interface IEventSongRecord {
  id: string;
  parts: string[];
  event: {
    id: string;
    startAt: Date;
    closedAt: Date | null;
    vocalEntryLimit: number | null;
    instrumentEntryLimit: number | null;
  };
}

export interface IReservationRecord {
  id: string;
  userId: string;
  eventSongId: string;
  part: string;
}

export interface IMyReservationRecord {
  reservationId: string;
  event: { id: string; title: string; startAt: Date; venue: string };
  song: { title: string; artist: string };
  part: string;
  isTransferable: boolean;
  createdAt: Date;
}

export interface IReservationRepository {
  /** eventSongId でイベント曲とイベント情報を取得する */
  findEventSongWithEvent(eventSongId: string): Promise<IEventSongRecord | null>;
  /** userId に紐づく今後の予約一覧を開催日昇順で取得する */
  findUpcomingByUserId(userId: string): Promise<IMyReservationRecord[]>;
  /** ユーザーがあるイベント内で指定パート群に持つ予約数を返す */
  countByUserIdAndEventIdAndParts(userId: string, eventId: string, parts: string[]): Promise<number>;
  /** eventSongId とパートで既存の予約を検索する */
  findByEventSongIdAndPart(eventSongId: string, part: string): Promise<{ id: string } | null>;
  /** userId と eventSongId でその曲における既存予約一覧を取得する */
  findByUserIdAndEventSongId(userId: string, eventSongId: string): Promise<IReservationRecord[]>;
  /** 予約IDで予約を取得する */
  findById(reservationId: string): Promise<IReservationRecord | null>;
  /** 予約の譲渡可否を更新する */
  updateTransferable(reservationId: string, isTransferable: boolean): Promise<void>;
  /** 予約を削除する */
  deleteById(reservationId: string): Promise<void>;
  /** 複数の予約をトランザクションで一括作成する */
  createMany(data: Array<{
    userId: string;
    eventSongId: string;
    part: string;
    snsConsent: boolean;
    isTransferable: boolean;
    comment?: string;
  }>): Promise<void>;
}
