import type { IEventRepository } from "@/server/repositories/events/event-repository";
import type { Event, SongWithReservations } from "@/lib/types/domain/events";

type GetEventSongsResult =
  | { status: "ok"; event: Event; songs: SongWithReservations[] }
  | { status: "not-found" };

/**
 * 全イベントを取得し、募集中・終了済みでソートして返す。
 * 募集中イベント（(closedAt ?? startAt) > 現在時刻）を startAt 昇順で先頭に並べ、
 * 終了済みイベントを startAt 降順でその後に続ける。
 * 日時フィールドは ISO 8601 文字列に変換する。
 */
export async function getEvents(repo: IEventRepository): Promise<Event[]> {
  const records = await repo.findAllEvents();
  const now = new Date();

  const isOpen = (startAt: Date, closedAt: Date | null) =>
    (closedAt ?? startAt) > now;

  const open = records
    .filter((e) => isOpen(e.startAt, e.closedAt))
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  const closed = records
    .filter((e) => !isOpen(e.startAt, e.closedAt))
    .sort((a, b) => b.startAt.getTime() - a.startAt.getTime());

  return [...open, ...closed].map((e) => ({
    id: e.id,
    title: e.title,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt.toISOString(),
    closedAt: e.closedAt ? e.closedAt.toISOString() : null,
    venue: e.venue,
    description: e.description,
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
    startAt: eventRecord.startAt.toISOString(),
    endAt: eventRecord.endAt.toISOString(),
    closedAt: eventRecord.closedAt ? eventRecord.closedAt.toISOString() : null,
    venue: eventRecord.venue,
    description: eventRecord.description,
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
