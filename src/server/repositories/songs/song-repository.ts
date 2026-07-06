import type { Part } from "@drizzle/schema/enums";

/**
 * 曲マスタ 1 件を表すレコード型。
 */
export interface ISongRecord {
  id: string;
  title: string;
  artist: string;
}

/**
 * イベント曲 1 件を表すレコード型。
 */
export interface IEventSongRecord {
  eventSongId: string;
  songId: string;
  title: string;
  artist: string;
  parts: Part[];
}

/**
 * 曲作成時の入力型。
 */
export interface ICreateSongInput {
  title: string;
  artist: string;
}

/**
 * イベントへの曲一括追加時、曲1件分の入力型。
 */
export interface IAddEventSongItem {
  songId: string;
  parts: Part[];
}

/**
 * イベントへの曲一括追加時の入力型。
 */
export interface IAddEventSongsInput {
  eventId: string;
  songs: IAddEventSongItem[];
}

export interface ISongRepository {
  /** 全曲マスタを取得する */
  findAllSongs(): Promise<ISongRecord[]>;
  /** 曲IDで1件取得する。存在しない場合は null を返す */
  findSongById(songId: string): Promise<ISongRecord | null>;
  /** 曲マスタを作成し、作成したレコードを返す */
  createSong(input: ICreateSongInput): Promise<ISongRecord>;
  /** イベントに紐づく既存の songId 一覧を取得する。重複登録チェックに使用する */
  findSongIdsByEventId(eventId: string): Promise<string[]>;
  /** イベントに複数曲を一括追加し、作成したレコード一覧を返す */
  addEventSongs(input: IAddEventSongsInput): Promise<IEventSongRecord[]>;
  /** イベント曲IDでイベント曲を削除する。存在しない場合は false を返す */
  deleteEventSong(eventSongId: string): Promise<boolean>;
  /** 指定した eventSongId 群のうち eventId に属するものを一括削除し、削除できた eventSongId 一覧を返す */
  deleteEventSongs(eventId: string, eventSongIds: string[]): Promise<string[]>;
  /** イベント曲の募集パートを更新する。存在しない場合は null を返す */
  updateEventSongParts(eventSongId: string, parts: Part[]): Promise<{ eventSongId: string; parts: Part[] } | null>;
  /** イベント曲の指定パートのエントリー（予約）を削除する。募集パート自体は残す。存在しない場合は false を返す */
  removeReservation(eventSongId: string, part: Part): Promise<boolean>;
}
