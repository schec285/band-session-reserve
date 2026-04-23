import type { ISongRepository } from "@/server/repositories/songs/song-repository";
import type { AdminSongResponse, AdminEventSongResponse, CreateSongInput, AddEventSongInput, UpdateEventSongPartsInput } from "@/lib/types/api/admin/songs";
import type { Part } from "@drizzle/schema/enums";

type CreateSongResult =
  | { status: "ok"; song: AdminSongResponse }

type AddEventSongResult =
  | { status: "ok"; eventSong: AdminEventSongResponse }

type DeleteEventSongResult =
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
 * 曲マスタを作成する。
 */
export async function createSong(
  repo: ISongRepository,
  input: CreateSongInput
): Promise<CreateSongResult> {
  const record = await repo.createSong({ title: input.title, artist: input.artist });
  return { status: "ok", song: record };
}

/**
 * イベントに曲を追加する。
 * eventId は URL パラメータから、input はリクエストボディから取得する。
 */
export async function addEventSong(
  repo: ISongRepository,
  eventId: string,
  input: AddEventSongInput
): Promise<AddEventSongResult> {
  const record = await repo.addEventSong({
    eventId,
    songId: input.songId,
    parts: input.parts as Part[],
  });
  return { status: "ok", eventSong: record };
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
