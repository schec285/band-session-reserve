import type { IEventRepository } from "@/server/repositories/events/event-repository";
import type { Event, SongWithReservations } from "@/lib/types/domain/events";
import { toJST } from "@/lib/utils/date";

type GetEventSongsResult =
  | { status: "ok"; event: Event; songs: SongWithReservations[] }
  | { status: "not-found" };

/**
 * 全イベントを取得し、開催中・開催予定・開催終了でソートして返す。
 * 開催中イベント（startAt <= 現在時刻 <= endAt）を endAt 昇順で先頭に並べ、
 * 開催予定イベント（startAt > 現在時刻）を startAt 昇順で続け、
 * 開催終了イベント（endAt < 現在時刻）を startAt 降順で末尾に並べる。
 * 日時フィールドは ISO 8601 文字列に変換する。
 */
export async function getEvents(repo: IEventRepository): Promise<Event[]> {
  const records = await repo.findAllEvents();
  const now = new Date();

  const ongoing = records
    .filter((e) => e.startAt <= now && now <= e.endAt)
    .sort((a, b) => a.endAt.getTime() - b.endAt.getTime());

  const upcoming = records
    .filter((e) => e.startAt > now)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  const ended = records
    .filter((e) => e.endAt <= now)
    .sort((a, b) => b.startAt.getTime() - a.startAt.getTime());

  return [...ongoing, ...upcoming, ...ended].map((e) => ({
    id: e.id,
    title: e.title,
    startAt: toJST(e.startAt),
    endAt: toJST(e.endAt),
    closedAt: e.closedAt ? toJST(e.closedAt) : null,
    venue: e.venue,
    mapEmbedUrl: e.mapEmbedUrl,
    participationFee: e.participationFee,
    description: e.description,
    vocalEntryLimit: e.vocalEntryLimit,
    instrumentEntryLimit: e.instrumentEntryLimit,
  }));
}

/**
 * 指定イベントの曲一覧とパート別予約状況を取得する。
 * currentUserId を渡すと、自分の予約エントリーに isOwner: true を付与する。
 * 未認証（currentUserId が undefined）の場合は全エントリーが isOwner: false になる。
 * userId はレスポンスに含めず、内部判定のみに使用する。
 * イベントが存在しない場合は status: "not-found" を返す。
 */
export async function getEventSongs(
  repo: IEventRepository,
  eventId: string,
  currentUserId?: string
): Promise<GetEventSongsResult> {
  const [eventRecord, songRecords] = await Promise.all([
    repo.findEventById(eventId),
    repo.findEventSongsWithReservations(eventId),
  ]);
  if (eventRecord === null || songRecords === null) return { status: "not-found" };
  const event: Event = {
    id: eventRecord.id,
    title: eventRecord.title,
    startAt: toJST(eventRecord.startAt),
    endAt: toJST(eventRecord.endAt),
    closedAt: eventRecord.closedAt ? toJST(eventRecord.closedAt) : null,
    venue: eventRecord.venue,
    mapEmbedUrl: eventRecord.mapEmbedUrl,
    participationFee: eventRecord.participationFee,
    description: eventRecord.description,
    vocalEntryLimit: eventRecord.vocalEntryLimit,
    instrumentEntryLimit: eventRecord.instrumentEntryLimit,
  };
  const songs: SongWithReservations[] = songRecords.map((song) => ({
    id: song.id,
    eventSongId: song.eventSongId,
    title: song.title,
    artist: song.artist,
    reservations: song.reservations.map(({ part, username, userId, reservationId, isTransferable }) => ({
      part,
      username,
      isOwner: currentUserId !== undefined && userId === currentUserId,
      reservationId,
      isTransferable,
    })),
  }));
  return { status: "ok", event, songs };
}
