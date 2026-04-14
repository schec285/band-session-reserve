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
  venueFee: number;
  participationFee: number;
  description: string;
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
  venueFee: number;
  participationFee: number;
  description: string;
}

/**
 * admin 用パート別予約状況 1 件を表すレコード型。
 */
export interface IAdminReservationInfo {
  part: string;
  username: string | null;
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
  /** イベントを作成し、作成したレコードを返す */
  createEvent(input: IAdminCreateEventInput): Promise<IAdminEventRecord>;
  /** イベントを更新し、更新後のレコードを返す。存在しない場合は null を返す */
  updateEvent(eventId: string, input: IAdminCreateEventInput): Promise<IAdminEventRecord | null>;
  /** イベントを削除する。存在しない場合は false を返す */
  deleteEvent(eventId: string): Promise<boolean>;
}
