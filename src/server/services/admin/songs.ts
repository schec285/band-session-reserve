import type { ISongRepository } from "@/server/repositories/songs/song-repository";
import type { AdminSongResponse, AdminEventSongResponse, CreateSongsInput, AddEventSongsInput, UpdateEventSongPartsInput } from "@/lib/types/api/admin/songs";
import type { Part } from "@drizzle/schema/enums";

type CreateSongsResult = { status: "ok"; songs: AdminSongResponse[] };

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
  return await repo.findAllSongs();
}

/**
 * 曲マスタを複数件まとめて作成する。
 */
export async function createSongs(
  repo: ISongRepository,
  input: CreateSongsInput
): Promise<CreateSongsResult> {
  const records = await repo.createSongs(
    input.songs.map((song) => ({ title: song.title, artist: song.artist }))
  );
  return { status: "ok", songs: records };
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
