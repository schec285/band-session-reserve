export interface IEventSongRecord {
  id: string;
  parts: string[];
  event: {
    startAt: Date;
    closedAt: Date | null;
  };
}

export interface IReservationRecord {
  id: string;
  userId: string;
  eventSongId: string;
  part: string;
}

export interface IReservationRepository {
  /** eventSongId でイベント曲とイベント情報を取得する */
  findEventSongWithEvent(eventSongId: string): Promise<IEventSongRecord | null>;
  /** eventSongId とパートで既存の予約を検索する */
  findByEventSongIdAndPart(eventSongId: string, part: string): Promise<{ id: string } | null>;
  /** 予約IDで予約を取得する */
  findById(reservationId: string): Promise<IReservationRecord | null>;
  /** 予約のパートを更新する */
  updatePart(reservationId: string, part: string): Promise<void>;
  /** 予約を削除する */
  deleteById(reservationId: string): Promise<void>;
  /** 複数の予約をトランザクションで一括作成する */
  createMany(data: Array<{
    userId: string;
    eventSongId: string;
    part: string;
    snsConsent: boolean;
    comment?: string;
  }>): Promise<void>;
}
