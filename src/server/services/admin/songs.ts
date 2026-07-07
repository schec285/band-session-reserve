import type { ISongRepository, ISongRecord } from "@/server/repositories/songs/song-repository";
import type { AdminSongResponse, AdminEventSongResponse, CreateSongsInput, UpdateSongInput, AddEventSongsInput, UpdateEventSongPartsInput } from "@/lib/types/api/admin/songs";
import type { Part } from "@drizzle/schema/enums";
import { toJST } from "@/lib/utils/date";

type CreateSongsResult =
  | { status: "ok"; songs: AdminSongResponse[] }
  | { status: "duplicate"; duplicates: { title: string; artist: string }[] };

type UpdateSongResult =
  | { status: "ok"; song: AdminSongResponse }
  | { status: "not-found" };

type DeleteSongResult =
  | { status: "ok" }
  | { status: "not-found" };

/**
 * 曲マスタのレコードをAPIレスポンス形式に変換する（登録日時をJSTのISO文字列に変換）。
 */
function toAdminSongResponse(record: ISongRecord): AdminSongResponse {
  return {
    id: record.id,
    title: record.title,
    artist: record.artist,
    createdAt: toJST(record.createdAt),
    inUse: record.inUse,
  };
}

type AddEventSongsResult = { status: "ok"; eventSongs: AdminEventSongResponse[] };

type DeleteEventSongResult =
  | { status: "ok" }
  | { status: "not-found" };

type DeleteEventSongsResult = { status: "ok"; deletedEventSongIds: string[] };

type RemoveReservationResult =
  | { status: "ok" }
  | { status: "not-found" };

type UpdateEventSongPartsResult =
  | { status: "ok"; eventSongId: string; parts: Part[] }
  | { status: "not-found" };

/**
 * 全曲マスタを取得する。
 */
export async function getAllSongs(repo: ISongRepository): Promise<AdminSongResponse[]> {
  const records = await repo.findAllSongs();
  return records.map(toAdminSongResponse);
}

/**
 * 曲名・アーティストの組み合わせからマップのキーを作る。
 */
function songKey(title: string, artist: string): string {
  return `${title} ${artist}`;
}

/**
 * 曲マスタを複数件まとめて作成する。
 * 既存の曲、またはリクエスト内で同じ曲名・アーティストの組み合わせが重複する場合は
 * 作成を行わず status: "duplicate" を返す。
 */
export async function createSongs(
  repo: ISongRepository,
  input: CreateSongsInput
): Promise<CreateSongsResult> {
  const existingSongs = await repo.findAllSongs();
  const existingKeys = new Set(existingSongs.map((s) => songKey(s.title, s.artist)));

  const seenInRequest = new Set<string>();
  const duplicates = new Map<string, { title: string; artist: string }>();

  for (const song of input.songs) {
    const key = songKey(song.title, song.artist);
    if (existingKeys.has(key) || seenInRequest.has(key)) {
      duplicates.set(key, { title: song.title, artist: song.artist });
    }
    seenInRequest.add(key);
  }

  if (duplicates.size > 0) {
    return { status: "duplicate", duplicates: Array.from(duplicates.values()) };
  }

  const records = await repo.createSongs(
    input.songs.map((song) => ({ title: song.title, artist: song.artist }))
  );
  return { status: "ok", songs: records.map(toAdminSongResponse) };
}

/**
 * 曲名を更新する。存在しない場合は status: "not-found" を返す。
 */
export async function updateSong(
  repo: ISongRepository,
  songId: string,
  input: UpdateSongInput
): Promise<UpdateSongResult> {
  const record = await repo.updateSong(songId, { title: input.title });
  if (!record) return { status: "not-found" };
  return { status: "ok", song: toAdminSongResponse(record) };
}

/**
 * 曲マスタを削除する。存在しない場合は status: "not-found" を返す。
 * イベントで使用中の曲を削除した場合、当該曲のイベントへの登録・エントリー（予約）も
 * あわせて削除される（呼び出し側で削除内容の同意を得た前提。src/server/repositories 参照）。
 */
export async function deleteSong(repo: ISongRepository, songId: string): Promise<DeleteSongResult> {
  const deleted = await repo.deleteSong(songId);
  if (!deleted) return { status: "not-found" };
  return { status: "ok" };
}

/**
 * イベントに複数の曲を一括追加する。
 * eventId は URL パラメータから、input はリクエストボディから取得する。
 * 同一イベントに同じ曲を複数回登録することも許容する。
 */
export async function addEventSongs(
  repo: ISongRepository,
  eventId: string,
  input: AddEventSongsInput
): Promise<AddEventSongsResult> {
  const records = await repo.addEventSongs({
    eventId,
    songs: input.songs.map((song) => ({ songId: song.songId, parts: song.parts as Part[] })),
  });
  return { status: "ok", eventSongs: records };
}

/**
 * イベント曲の募集パートを更新する。存在しない場合は status: "not-found" を返す。
 */
export async function updateEventSongParts(
  repo: ISongRepository,
  eventSongId: string,
  input: UpdateEventSongPartsInput
): Promise<UpdateEventSongPartsResult> {
  const record = await repo.updateEventSongParts(eventSongId, input.parts as Part[]);
  if (!record) return { status: "not-found" };
  return { status: "ok", eventSongId: record.eventSongId, parts: record.parts };
}

/**
 * イベント曲を削除する。存在しない場合は status: "not-found" を返す。
 */
export async function deleteEventSong(
  repo: ISongRepository,
  eventSongId: string
): Promise<DeleteEventSongResult> {
  const deleted = await repo.deleteEventSong(eventSongId);
  if (!deleted) return { status: "not-found" };
  return { status: "ok" };
}

/**
 * イベントから複数の曲をまとめて削除する。
 * eventId に属さない eventSongId は無視される。
 */
export async function deleteEventSongs(
  repo: ISongRepository,
  eventId: string,
  eventSongIds: string[]
): Promise<DeleteEventSongsResult> {
  const deletedEventSongIds = await repo.deleteEventSongs(eventId, eventSongIds);
  return { status: "ok", deletedEventSongIds };
}

/**
 * イベント曲の指定パートのエントリー（予約）を削除する。募集パート自体は変更しない。
 * 存在しない場合は status: "not-found" を返す。
 */
export async function removeReservation(
  repo: ISongRepository,
  eventSongId: string,
  part: Part
): Promise<RemoveReservationResult> {
  const removed = await repo.removeReservation(eventSongId, part);
  if (!removed) return { status: "not-found" };
  return { status: "ok" };
}
