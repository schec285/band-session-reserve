import type { IReservationRepository, IEventSongRecord } from "@/server/repositories/reserve/reservation-repository";
import { FORBIDDEN_SAME_SONG_PAIRS, VOCAL_PARTS, getPartCategory } from "@/lib/utils/parts";
import type { Part } from "@drizzle/schema";

type CreateReservationsResult =
  | { status: "ok" }
  | { status: "not-found" }
  | { status: "filled" }
  | { status: "closed" }
  | { status: "forbidden-combination" }
  | { status: "entry-limit-exceeded" };

/**
 * 複数の予約を一括作成する。
 * Phase 1: 全エントリーの eventSong を一括取得（not-found チェック）
 * Phase 2: エントリー数制限チェック（イベントごと・カテゴリごとにバッチ合算で検証）
 * Phase 3: 既存チェック（closed / forbidden-combination / filled）
 * 1件でも失敗した場合は全件キャンセルする。全件通過後に createMany で一括保存する。
 */
export async function createReservations(
  repo: IReservationRepository,
  params: {
    userId: string;
    entries: Array<{ eventSongId: string; part: string; isTransferable: boolean }>;
    snsConsent: boolean;
    comment?: string;
  }
): Promise<CreateReservationsResult> {
  // Phase 1: 全エントリーの eventSong を取得
  const eventSongMap = new Map<string, IEventSongRecord>();
  for (const entry of params.entries) {
    if (!eventSongMap.has(entry.eventSongId)) {
      const eventSong = await repo.findEventSongWithEvent(entry.eventSongId);
      if (!eventSong) return { status: "not-found" };
      eventSongMap.set(entry.eventSongId, eventSong);
    }
  }

  // Phase 2: エントリー数制限チェック
  // (eventId, category) をキーとしてバッチ内のエントリー数を集計する
  const batchCounts = new Map<string, number>();
  for (const entry of params.entries) {
    const eventSong = eventSongMap.get(entry.eventSongId)!;
    const category = getPartCategory(entry.part as Part);
    const key = `${eventSong.event.id}:${category}`;
    batchCounts.set(key, (batchCounts.get(key) ?? 0) + 1);
  }

  for (const [key, batchCount] of batchCounts) {
    const [eventId, category] = key.split(":") as [string, "vocal" | "instrument"];
    // イベントの上限値を取得（いずれかのentryからeventSongを参照）
    const anySong = [...eventSongMap.values()].find((s) => s.event.id === eventId)!;
    const limit = category === "vocal"
      ? anySong.event.vocalEntryLimit
      : anySong.event.instrumentEntryLimit;
    if (limit === null) continue; // null = 制限なし

    const categoryParts = category === "vocal"
      ? [...VOCAL_PARTS]
      : (["readGuitar", "backingGuitar", "bass", "drums", "keyboard", "other"] as string[]);
    const dbCount = await repo.countByUserIdAndEventIdAndParts(params.userId, eventId, categoryParts);
    if (dbCount + batchCount > limit) return { status: "entry-limit-exceeded" };
  }

  // Phase 3: 既存チェック（closed / forbidden-combination / filled / 譲渡引受）
  type TakeoverEntry = { reservationId: string; previousUserId: string; entry: typeof params.entries[number] };
  const takeoverEntries: TakeoverEntry[] = [];
  const takeoverKeys = new Set<string>();

  for (const entry of params.entries) {
    const eventSong = eventSongMap.get(entry.eventSongId)!;

    const deadline = eventSong.event.closedAt ?? eventSong.event.startAt;
    if (deadline <= new Date()) return { status: "closed" };

    const existingByUser = await repo.findByUserIdAndEventSongId(params.userId, entry.eventSongId);
    const hasForbidden = existingByUser.some((r) =>
      FORBIDDEN_SAME_SONG_PAIRS.some(
        ([a, b]) => (r.part === a && entry.part === b) || (r.part === b && entry.part === a)
      )
    );
    if (hasForbidden) return { status: "forbidden-combination" };

    const existing = await repo.findByEventSongIdAndPart(entry.eventSongId, entry.part);
    if (existing) {
      if (!existing.isTransferable) return { status: "filled" };
      // 譲渡可の場合は引受OKとして UPDATE 対象に積む
      takeoverEntries.push({ reservationId: existing.id, previousUserId: existing.userId, entry });
      takeoverKeys.add(`${entry.eventSongId}:${entry.part}`);
    }
  }

  // 譲渡引受: 既存予約を UPDATE して新ユーザーに置き換える
  for (const takeover of takeoverEntries) {
    await repo.takeoverReservation(takeover.reservationId, {
      userId: params.userId,
      previousUserId: takeover.previousUserId,
      snsConsent: params.snsConsent,
      comment: params.comment,
    });
  }

  // 新規エントリーのみ INSERT
  const newEntries = params.entries.filter((e) => !takeoverKeys.has(`${e.eventSongId}:${e.part}`));
  if (newEntries.length > 0) {
    await repo.createMany(
      newEntries.map((entry) => ({
        userId: params.userId,
        eventSongId: entry.eventSongId,
        part: entry.part,
        snsConsent: params.snsConsent,
        isTransferable: entry.isTransferable,
        comment: params.comment,
      }))
    );
  }

  return { status: "ok" };
}

type UpdateTransferableResult =
  | { status: "ok" }
  | { status: "not-found" }
  | { status: "forbidden" }
  | { status: "closed" };

/**
 * 予約の譲渡可否を変更する。
 * 予約の存在確認・所有権確認・受付状況を確認し、isTransferable を更新する。
 */
export async function updateTransferable(
  repo: IReservationRepository,
  params: {
    reservationId: string;
    userId: string;
    isTransferable: boolean;
  }
): Promise<UpdateTransferableResult> {
  const reservation = await repo.findById(params.reservationId);
  if (!reservation) return { status: "not-found" };
  if (reservation.userId !== params.userId) return { status: "forbidden" };

  const eventSong = await repo.findEventSongWithEvent(reservation.eventSongId);
  if (!eventSong) return { status: "not-found" };

  const deadline = eventSong.event.closedAt ?? eventSong.event.startAt;
  if (deadline <= new Date()) return { status: "closed" };

  await repo.updateTransferable(params.reservationId, params.isTransferable);
  return { status: "ok" };
}

type CancelReservationResult =
  | { status: "ok" }
  | { status: "not-found" }
  | { status: "forbidden" }
  | { status: "closed" };

/**
 * 予約をキャンセルする。
 * 予約の存在確認・所有権確認・受付状況を確認し、予約レコードを削除する。
 */
export async function cancelReservation(
  repo: IReservationRepository,
  params: {
    reservationId: string;
    userId: string;
  }
): Promise<CancelReservationResult> {
  const reservation = await repo.findById(params.reservationId);
  if (!reservation) return { status: "not-found" };
  if (reservation.userId !== params.userId) return { status: "forbidden" };

  const eventSong = await repo.findEventSongWithEvent(reservation.eventSongId);
  if (!eventSong) return { status: "not-found" };

  const deadline = eventSong.event.closedAt ?? eventSong.event.startAt;
  if (deadline <= new Date()) return { status: "closed" };

  await repo.deleteById(params.reservationId);
  return { status: "ok" };
}
