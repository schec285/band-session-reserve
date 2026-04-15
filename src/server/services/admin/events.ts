import type { IAdminEventRepository } from "@/server/repositories/admin/event-repository";
import type { AdminEventResponse, CreateEventInput, UpdateEventInput } from "@/lib/types/api/admin/events";
import { toJST } from "@/lib/utils/date";
import type { Part } from "@drizzle/schema";

type CreateEventResult = { status: "ok"; event: AdminEventResponse };

type UpdateEventResult =
  | { status: "ok"; event: AdminEventResponse }
  | { status: "not-found" };

type DeleteEventResult =
  | { status: "ok" }
  | { status: "not-found" };

/**
 * 編集フォームに渡す曲情報。
 * parts は予約状況から part 名のみ抽出したリスト。
 */
export type AdminEventSongInfo = {
  eventSongId: string;
  songId: string;
  title: string;
  artist: string;
  parts: Part[];
};

type GetEventForEditResult =
  | { status: "ok"; event: AdminEventResponse; songs: AdminEventSongInfo[] }
  | { status: "not-found" };

/**
 * IAdminEventRecord を AdminEventResponse（ISO 8601 文字列）に変換する。
 */
function toResponse(record: {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  closedAt: Date | null;
  venue: string;
  venueFee: number;
  participationFee: number;
  description: string;
  vocalEntryLimit: number | null;
  instrumentEntryLimit: number | null;
}): AdminEventResponse {
  return {
    id: record.id,
    title: record.title,
    startAt: toJST(record.startAt),
    endAt: toJST(record.endAt),
    closedAt: record.closedAt ? toJST(record.closedAt) : null,
    venue: record.venue,
    venueFee: record.venueFee,
    participationFee: record.participationFee,
    description: record.description,
    vocalEntryLimit: record.vocalEntryLimit,
    instrumentEntryLimit: record.instrumentEntryLimit,
  };
}

/**
 * イベントを作成する。
 */
export async function createEvent(
  repo: IAdminEventRepository,
  input: CreateEventInput
): Promise<CreateEventResult> {
  const record = await repo.createEvent({
    title: input.title,
    startAt: new Date(input.startAt),
    endAt: new Date(input.endAt),
    closedAt: input.closedAt ? new Date(input.closedAt) : null,
    venue: input.venue,
    venueFee: input.venueFee ?? 0,
    participationFee: input.participationFee ?? 0,
    description: input.description,
    vocalEntryLimit: input.vocalEntryLimit ?? null,
    instrumentEntryLimit: input.instrumentEntryLimit ?? null,
  });

  return { status: "ok", event: toResponse(record) };
}

/**
 * イベントを更新する。存在しない場合は status: "not-found" を返す。
 */
export async function updateEvent(
  repo: IAdminEventRepository,
  eventId: string,
  input: UpdateEventInput
): Promise<UpdateEventResult> {
  const record = await repo.updateEvent(eventId, {
    title: input.title,
    startAt: new Date(input.startAt),
    endAt: new Date(input.endAt),
    closedAt: input.closedAt ? new Date(input.closedAt) : null,
    venue: input.venue,
    venueFee: input.venueFee ?? 0,
    participationFee: input.participationFee ?? 0,
    description: input.description,
    vocalEntryLimit: input.vocalEntryLimit ?? null,
    instrumentEntryLimit: input.instrumentEntryLimit ?? null,
  });

  if (!record) return { status: "not-found" };
  return { status: "ok", event: toResponse(record) };
}

/**
 * イベントを削除する。存在しない場合は status: "not-found" を返す。
 */
export async function deleteEvent(
  repo: IAdminEventRepository,
  eventId: string
): Promise<DeleteEventResult> {
  const deleted = await repo.deleteEvent(eventId);
  if (!deleted) return { status: "not-found" };
  return { status: "ok" };
}

/**
 * 編集ページ用にイベント情報と曲一覧を取得する。
 * 曲ごとの reservations から part 名のみ抽出して返す。
 * イベントが存在しない場合は status: "not-found" を返す。
 */
export async function getEventForEdit(
  repo: IAdminEventRepository,
  eventId: string
): Promise<GetEventForEditResult> {
  const [eventRecord, songRecords] = await Promise.all([
    repo.findEventById(eventId),
    repo.findEventSongsWithReservations(eventId),
  ]);

  if (!eventRecord || songRecords === null) return { status: "not-found" };

  const songs: AdminEventSongInfo[] = songRecords.map((s) => ({
    eventSongId: s.eventSongId,
    songId: s.id,
    title: s.title,
    artist: s.artist,
    parts: s.reservations.map((r) => r.part as Part),
  }));

  return { status: "ok", event: toResponse(eventRecord), songs };
}
