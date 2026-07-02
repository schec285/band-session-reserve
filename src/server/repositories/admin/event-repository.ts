/**
 * admin 用イベント 1 件を表すレコード型。
 * venueFee など管理者のみが扱うフィールドを含む。
 */
export interface IAdminEventRecord {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  closedAt: Date | null;
  venue: string;
  mapEmbedUrl: string | null;
  venueFee: number;
  participationFee: number;
  description: string;
  vocalEntryLimit: number | null;
  instrumentEntryLimit: number | null;
}

/**
 * イベント作成・更新時の入力型。
 */
export interface IAdminCreateEventInput {
  title: string;
  startAt: Date;
  endAt: Date;
  closedAt: Date | null;
  venue: string;
  mapEmbedUrl: string | null;
  venueFee: number;
  participationFee: number;
  description: string;
  vocalEntryLimit: number | null;
  instrumentEntryLimit: number | null;
}

/**
 * admin 用パート別予約状況 1 件を表すレコード型。
 */
export interface IAdminReservationInfo {
  part: string;
  username: string | null;
  userId: string | null;
}

/**
 * admin 用予約状況付き曲 1 件を表すレコード型。
 */
export interface IAdminSongWithReservations {
  id: string;
  eventSongId: string;
  title: string;
  artist: string;
  reservations: IAdminReservationInfo[];
}

export interface IAdminEventRepository {
  /** 全イベントを取得する */
  findAllEvents(): Promise<IAdminEventRecord[]>;
  /** イベントIDで1件取得する。存在しない場合は null を返す */
  findEventById(eventId: string): Promise<IAdminEventRecord | null>;
  /**
   * イベントIDで曲一覧とパート別予約状況を取得する。
   * イベントが存在しない場合は null を返す。
   * イベントが存在するが曲が 0 件の場合は空配列を返す。
   */
  findEventSongsWithReservations(eventId: string): Promise<IAdminSongWithReservations[] | null>;
  /** イベントの徴収済みユーザーIDセットを取得する */
  findCollectedUserIds(eventId: string): Promise<Set<string>>;
  /**
   * 徴収状況を更新する。
   * collected: true → 徴収済みとして記録（既存の場合は何もしない）
   * collected: false → 徴収記録を削除
   * イベントが存在しない場合は false を返す。
   */
  setCollected(eventId: string, userId: string, collected: boolean): Promise<boolean>;
  /** イベントを作成し、作成したレコードを返す */
  createEvent(input: IAdminCreateEventInput): Promise<IAdminEventRecord>;
  /** イベントを更新し、更新後のレコードを返す。存在しない場合は null を返す */
  updateEvent(eventId: string, input: IAdminCreateEventInput): Promise<IAdminEventRecord | null>;
  /** イベントを削除する。存在しない場合は false を返す */
  deleteEvent(eventId: string): Promise<boolean>;
}
