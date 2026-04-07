/**
 * イベント 1 件を表すレコード型。
 * 日時フィールドは DB から取得した Date オブジェクトのまま保持する。
 */
export interface IEventRecord {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  closedAt: Date | null;
  venue: string;
  description: string;
}

/**
 * パート別予約状況 1 件を表すレコード型。
 * username が null の場合は空き、文字列の場合は予約済みを表す。
 */
export interface IReservationInfo {
  part: string;
  username: string | null;
}

/**
 * 予約状況付き曲 1 件を表すレコード型。
 */
export interface ISongWithReservations {
  id: string;
  eventSongId: string;
  title: string;
  artist: string;
  reservations: IReservationInfo[];
}

/**
 * イベント作成時の入力型。
 */
export interface ICreateEventInput {
  title: string;
  startAt: Date;
  endAt: Date;
  closedAt: Date | null;
  venue: string;
  description: string;
}

export interface IEventRepository {
  /** 全イベントを取得する */
  findAllEvents(): Promise<IEventRecord[]>;
  /** イベントIDで1件取得する。存在しない場合は null を返す */
  findEventById(eventId: string): Promise<IEventRecord | null>;
  /**
   * イベントIDで曲一覧とパート別予約状況を取得する。
   * イベントが存在しない場合は null を返す。
   * イベントが存在するが曲が 0 件の場合は空配列を返す。
   */
  findEventSongsWithReservations(eventId: string): Promise<ISongWithReservations[] | null>;
  /** イベントを作成し、作成したレコードを返す */
  createEvent(input: ICreateEventInput): Promise<IEventRecord>;
  /** イベントを更新し、更新後のレコードを返す。存在しない場合は null を返す */
  updateEvent(eventId: string, input: ICreateEventInput): Promise<IEventRecord | null>;
  /** イベントを削除する。存在しない場合は false を返す */
  deleteEvent(eventId: string): Promise<boolean>;
}
