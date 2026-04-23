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
 * イベントへの曲追加時の入力型。
 */
export interface IAddEventSongInput {
  eventId: string;
  songId: string;
  parts: Part[];
}

export interface ISongRepository {
  /** 全曲マスタを取得する */
  findAllSongs(): Promise<ISongRecord[]>;
  /** 曲IDで1件取得する。存在しない場合は null を返す */
  findSongById(songId: string): Promise<ISongRecord | null>;
  /** 曲マスタを作成し、作成したレコードを返す */
  createSong(input: ICreateSongInput): Promise<ISongRecord>;
  /** イベントに曲を追加し、作成したレコードを返す */
  addEventSong(input: IAddEventSongInput): Promise<IEventSongRecord>;
  /** イベント曲IDでイベント曲を削除する。存在しない場合は false を返す */
  deleteEventSong(eventSongId: string): Promise<boolean>;
  /** イベント曲の募集パートを更新する。存在しない場合は null を返す */
  updateEventSongParts(eventSongId: string, parts: Part[]): Promise<{ eventSongId: string; parts: Part[] } | null>;
}
