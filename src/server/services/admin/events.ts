import type { IAdminEventRepository } from "@/server/repositories/admin/event-repository";
import type { AdminEventResponse, CreateEventInput, UpdateEventInput } from "@/lib/types/api/admin/events";
import { toJST } from "@/lib/utils/date";
import { PART_ORDER } from "@/lib/utils/parts";
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
 * parts は募集パートとエントリー有無・エントリー済みの場合のユーザー名のリスト。
 */
export type AdminEventSongInfo = {
  eventSongId: string;
  songId: string;
  title: string;
  artist: string;
  parts: { part: Part; entered: boolean; username: string | null }[];
};

/**
 * エントリー一覧に表示する参加者情報。
 * ユーザー単位で、そのユーザーがエントリーしているパートを PART_ORDER 順で持つ。
 * 一覧全体はユーザー名の五十音順（日本語ロケール比較）で並べる。
 */
export type AdminEventEntrant = {
  userId: string;
  username: string;
  parts: Part[];
  collected: boolean;
};

type GetEventForEditResult =
  | { status: "ok"; event: AdminEventResponse; songs: AdminEventSongInfo[]; entrants: AdminEventEntrant[] }
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
  mapEmbedUrl: string | null;
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
    mapEmbedUrl: record.mapEmbedUrl,
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
    mapEmbedUrl: input.mapEmbedUrl ?? null,
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
    mapEmbedUrl: input.mapEmbedUrl ?? null,
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
    parts: s.reservations.map((r) => ({
      part: r.part as Part,
      entered: r.username !== null,
      username: r.username,
    })),
  }));

  const entrantMap = new Map<string, { username: string; parts: Set<Part> }>();
  for (const s of songRecords) {
    for (const r of s.reservations) {
      if (r.username && r.userId) {
        const existing = entrantMap.get(r.userId) ?? { username: r.username, parts: new Set<Part>() };
        existing.parts.add(r.part as Part);
        entrantMap.set(r.userId, existing);
      }
    }
  }

  const collectedIds = await repo.findCollectedUserIds(eventId);

  const entrants: AdminEventEntrant[] = [...entrantMap.entries()]
    .map(([userId, { username, parts }]) => ({
      userId,
      username,
      parts: [...parts].sort((a, b) => PART_ORDER.indexOf(a) - PART_ORDER.indexOf(b)),
      collected: collectedIds.has(userId),
    }))
    .sort((a, b) => a.username.localeCompare(b.username, "ja"));

  return { status: "ok", event: toResponse(eventRecord), songs, entrants };
}

type SetCollectionResult =
  | { status: "ok" }
  | { status: "not-found" };

/**
 * 参加費の徴収状況を更新する。
 * イベントが存在しない場合は status: "not-found" を返す。
 */
export async function setCollection(
  repo: IAdminEventRepository,
  eventId: string,
  userId: string,
  collected: boolean
): Promise<SetCollectionResult> {
  const updated = await repo.setCollected(eventId, userId, collected);
  if (!updated) return { status: "not-found" };
  return { status: "ok" };
}
