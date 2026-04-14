import type { Mocked } from "vitest";
import { getEvents, getEventSongs } from "@/server/services/events/events";
import type { IEventRecord, IEventRepository } from "@/server/repositories/events/event-repository";

const now = new Date();
const nearFuture  = new Date(now.getTime() + 1000 * 60 * 60 * 24);       // 1日後
const farFuture   = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 10);  // 10日後
const recentPast  = new Date(now.getTime() - 1000 * 60 * 60 * 24);       // 1日前
const distantPast = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10);  // 10日前

/** 募集中イベント（startAt が未来・closedAt null） */
const openEventNear: IEventRecord = {
  id: "open-near",
  title: "近いイベント",
  startAt: nearFuture,
  endAt: new Date(nearFuture.getTime() + 1000 * 60 * 60 * 8),
  closedAt: null,
  venue: "渋谷スタジオ A",
  participationFee: 500,
  description: "",
};

/** 募集中イベント（startAt がさらに未来・closedAt null） */
const openEventFar: IEventRecord = {
  id: "open-far",
  title: "遠いイベント",
  startAt: farFuture,
  endAt: new Date(farFuture.getTime() + 1000 * 60 * 60 * 8),
  closedAt: null,
  venue: "新宿スタジオ B",
  participationFee: 0,
  description: "",
};

/** 終了済みイベント（closedAt が過去） */
const closedEventRecent: IEventRecord = {
  id: "closed-recent",
  title: "最近終わったイベント",
  startAt: recentPast,
  endAt: new Date(recentPast.getTime() + 1000 * 60 * 60 * 8),
  closedAt: new Date(recentPast.getTime() - 1000 * 60 * 60),
  venue: "池袋スタジオ C",
  participationFee: 0,
  description: "",
};

/** 終了済みイベント（startAt が過去・closedAt null） */
const closedEventDistant: IEventRecord = {
  id: "closed-distant",
  title: "昔のイベント",
  startAt: distantPast,
  endAt: new Date(distantPast.getTime() + 1000 * 60 * 60 * 8),
  closedAt: null,
  venue: "品川スタジオ D",
  participationFee: 0,
  description: "",
};

let mockRepo: Mocked<IEventRepository>;

beforeEach(() => {
  mockRepo = {
    findAllEvents: vi.fn(),
    findEventById: vi.fn(),
    findEventSongsWithReservations: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// getEvents
// ---------------------------------------------------------------------------

describe("getEvents", () => {
  it("募集中イベントを先頭（startAt 昇順）、終了済みをその後（startAt 降順）で返す", async () => {
    mockRepo.findAllEvents.mockResolvedValue([
      closedEventRecent,
      openEventFar,
      closedEventDistant,
      openEventNear,
    ]);

    const result = await getEvents(mockRepo);

    // 募集中が先 (startAt 昇順)
    expect(result[0].id).toBe("open-near");
    expect(result[1].id).toBe("open-far");
    // 終了済みが後 (startAt 降順)
    expect(result[2].id).toBe("closed-recent");
    expect(result[3].id).toBe("closed-distant");
  });

  it("募集中のみの場合: startAt 昇順で返す", async () => {
    mockRepo.findAllEvents.mockResolvedValue([openEventFar, openEventNear]);

    const result = await getEvents(mockRepo);

    expect(result[0].id).toBe("open-near");
    expect(result[1].id).toBe("open-far");
  });

  it("終了済みのみの場合: startAt 降順で返す", async () => {
    mockRepo.findAllEvents.mockResolvedValue([closedEventDistant, closedEventRecent]);

    const result = await getEvents(mockRepo);

    expect(result[0].id).toBe("closed-recent");
    expect(result[1].id).toBe("closed-distant");
  });

  it("イベントが 0 件の場合は空配列を返す", async () => {
    mockRepo.findAllEvents.mockResolvedValue([]);

    const result = await getEvents(mockRepo);

    expect(result).toEqual([]);
  });

  it("日時フィールドを JST（+09:00）付き ISO 8601 文字列に変換して返す", async () => {
    mockRepo.findAllEvents.mockResolvedValue([openEventNear]);

    const result = await getEvents(mockRepo);

    expect(result[0].startAt).toMatch(/\+09:00$/);
    expect(result[0].endAt).toMatch(/\+09:00$/);
  });

  it("closedAt が null の場合は null のまま返す", async () => {
    mockRepo.findAllEvents.mockResolvedValue([openEventNear]);

    const result = await getEvents(mockRepo);

    expect(result[0].closedAt).toBeNull();
  });

  it("closedAt が Date の場合は JST（+09:00）付き ISO 8601 文字列に変換して返す", async () => {
    mockRepo.findAllEvents.mockResolvedValue([closedEventRecent]);

    const result = await getEvents(mockRepo);

    expect(result[0].closedAt).toMatch(/\+09:00$/);
  });
});

// ---------------------------------------------------------------------------
// getEventSongs
// ---------------------------------------------------------------------------

describe("getEventSongs", () => {
  const mockEvent = {
    id: "event-uuid-1",
    title: "春のセッション",
    startAt: nearFuture,
    endAt: new Date(nearFuture.getTime() + 1000 * 60 * 60 * 8),
    closedAt: null,
    venue: "渋谷スタジオ A",
    participationFee: 500,
    description: "春のセッションです",
  };

  const currentUserId = "user-uuid-current";
  const otherUserId   = "user-uuid-other";

  const mockSongs = [
    {
      id: "song-uuid-1",
      eventSongId: "event-song-uuid-1",
      title: "千本桜",
      artist: "黒うさP",
      reservations: [
        { part: "readGuitar",    username: "yamada_taro", userId: currentUserId, reservationId: "reservation-uuid-1" },
        { part: "backingGuitar", username: null,          userId: null,          reservationId: null },
        { part: "drums",         username: "sato_hanako", userId: otherUserId,   reservationId: "reservation-uuid-2" },
      ],
    },
  ];

  it("ok: イベント情報と曲一覧を返す", async () => {
    mockRepo.findEventById.mockResolvedValue(mockEvent);
    mockRepo.findEventSongsWithReservations.mockResolvedValue(mockSongs);

    const result = await getEventSongs(mockRepo, "event-uuid-1");

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.event.id).toBe("event-uuid-1");
    expect(result.event.title).toBe("春のセッション");
    expect(result.event.startAt).toMatch(/\+09:00$/);
    expect(mockRepo.findEventById).toHaveBeenCalledWith("event-uuid-1");
    expect(mockRepo.findEventSongsWithReservations).toHaveBeenCalledWith("event-uuid-1");
  });

  it("ok: currentUserId を渡すと自分の予約に isOwner: true、他は false を返す", async () => {
    mockRepo.findEventById.mockResolvedValue(mockEvent);
    mockRepo.findEventSongsWithReservations.mockResolvedValue(mockSongs);

    const result = await getEventSongs(mockRepo, "event-uuid-1", currentUserId);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const reservations = result.songs[0].reservations;
    expect(reservations[0]).toMatchObject({ part: "readGuitar",    isOwner: true });
    expect(reservations[1]).toMatchObject({ part: "backingGuitar", isOwner: false });
    expect(reservations[2]).toMatchObject({ part: "drums",         isOwner: false });
  });

  it("ok: currentUserId を渡さない場合は全エントリーの isOwner が false", async () => {
    mockRepo.findEventById.mockResolvedValue(mockEvent);
    mockRepo.findEventSongsWithReservations.mockResolvedValue(mockSongs);

    const result = await getEventSongs(mockRepo, "event-uuid-1");

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const reservations = result.songs[0].reservations;
    expect(reservations.every((r) => r.isOwner === false)).toBe(true);
  });

  it("ok: 予約済みパートは reservationId を持ち、空きパートは null を返す", async () => {
    mockRepo.findEventById.mockResolvedValue(mockEvent);
    mockRepo.findEventSongsWithReservations.mockResolvedValue(mockSongs);

    const result = await getEventSongs(mockRepo, "event-uuid-1", currentUserId);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const reservations = result.songs[0].reservations;
    expect(reservations[0]).toMatchObject({ part: "readGuitar",    reservationId: "reservation-uuid-1" });
    expect(reservations[1]).toMatchObject({ part: "backingGuitar", reservationId: null });
    expect(reservations[2]).toMatchObject({ part: "drums",         reservationId: "reservation-uuid-2" });
  });

  it("ok: レスポンスに userId が含まれない", async () => {
    mockRepo.findEventById.mockResolvedValue(mockEvent);
    mockRepo.findEventSongsWithReservations.mockResolvedValue(mockSongs);

    const result = await getEventSongs(mockRepo, "event-uuid-1", currentUserId);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    result.songs[0].reservations.forEach((r) => {
      expect(r).not.toHaveProperty("userId");
    });
  });

  it("ok: 曲が 0 件の場合は空配列を返す", async () => {
    mockRepo.findEventById.mockResolvedValue(mockEvent);
    mockRepo.findEventSongsWithReservations.mockResolvedValue([]);

    const result = await getEventSongs(mockRepo, "event-uuid-1");

    expect(result).toMatchObject({ status: "ok", songs: [] });
  });

  it("not-found: イベントが存在しない場合", async () => {
    mockRepo.findEventById.mockResolvedValue(null);
    mockRepo.findEventSongsWithReservations.mockResolvedValue(null);

    const result = await getEventSongs(mockRepo, "nonexistent-uuid");

    expect(result).toEqual({ status: "not-found" });
  });
});
