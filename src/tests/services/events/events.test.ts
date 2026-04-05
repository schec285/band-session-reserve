import { getEvents, getEventSongs } from "@/server/services/events/events";
import type { IEventRepository } from "@/server/repositories/events/event-repository";

const now = new Date();
const nearFuture  = new Date(now.getTime() + 1000 * 60 * 60 * 24);       // 1日後
const farFuture   = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 10);  // 10日後
const recentPast  = new Date(now.getTime() - 1000 * 60 * 60 * 24);       // 1日前
const distantPast = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10);  // 10日前

/** 募集中イベント（startAt が未来・closedAt null） */
const openEventNear = {
  id: "open-near",
  title: "近いイベント",
  startAt: nearFuture,
  endAt: new Date(nearFuture.getTime() + 1000 * 60 * 60 * 8),
  closedAt: null,
  venue: "渋谷スタジオ A",
  description: "",
};

/** 募集中イベント（startAt がさらに未来・closedAt null） */
const openEventFar = {
  id: "open-far",
  title: "遠いイベント",
  startAt: farFuture,
  endAt: new Date(farFuture.getTime() + 1000 * 60 * 60 * 8),
  closedAt: null,
  venue: "新宿スタジオ B",
  description: "",
};

/** 終了済みイベント（closedAt が過去） */
const closedEventRecent = {
  id: "closed-recent",
  title: "最近終わったイベント",
  startAt: recentPast,
  endAt: new Date(recentPast.getTime() + 1000 * 60 * 60 * 8),
  closedAt: new Date(recentPast.getTime() - 1000 * 60 * 60),
  venue: "池袋スタジオ C",
  description: "",
};

/** 終了済みイベント（startAt が過去・closedAt null） */
const closedEventDistant = {
  id: "closed-distant",
  title: "昔のイベント",
  startAt: distantPast,
  endAt: new Date(distantPast.getTime() + 1000 * 60 * 60 * 8),
  closedAt: null,
  venue: "品川スタジオ D",
  description: "",
};

let mockRepo: jest.Mocked<IEventRepository>;

beforeEach(() => {
  mockRepo = {
    findAllEvents: jest.fn(),
    findEventSongsWithReservations: jest.fn(),
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

  it("日時フィールドを ISO 8601 文字列に変換して返す", async () => {
    mockRepo.findAllEvents.mockResolvedValue([openEventNear]);

    const result = await getEvents(mockRepo);

    expect(typeof result[0].startAt).toBe("string");
    expect(typeof result[0].endAt).toBe("string");
  });

  it("closedAt が null の場合は null のまま返す", async () => {
    mockRepo.findAllEvents.mockResolvedValue([openEventNear]);

    const result = await getEvents(mockRepo);

    expect(result[0].closedAt).toBeNull();
  });

  it("closedAt が Date の場合は ISO 8601 文字列に変換して返す", async () => {
    mockRepo.findAllEvents.mockResolvedValue([closedEventRecent]);

    const result = await getEvents(mockRepo);

    expect(typeof result[0].closedAt).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// getEventSongs
// ---------------------------------------------------------------------------

describe("getEventSongs", () => {
  const mockSongs = [
    {
      id: "song-uuid-1",
      title: "千本桜",
      artist: "黒うさP",
      reservations: [
        { part: "readGuitar",    username: "yamada_taro" },
        { part: "backingGuitar", username: null },
        { part: "drums",         username: "sato_hanako" },
      ],
    },
  ];

  it("ok: 曲一覧と予約状況を返す", async () => {
    mockRepo.findEventSongsWithReservations.mockResolvedValue(mockSongs);

    const result = await getEventSongs(mockRepo, "event-uuid-1");

    expect(result).toEqual({ status: "ok", songs: mockSongs });
    expect(mockRepo.findEventSongsWithReservations).toHaveBeenCalledWith("event-uuid-1");
  });

  it("ok: 曲が 0 件の場合は空配列を返す", async () => {
    mockRepo.findEventSongsWithReservations.mockResolvedValue([]);

    const result = await getEventSongs(mockRepo, "event-uuid-1");

    expect(result).toEqual({ status: "ok", songs: [] });
  });

  it("not-found: イベントが存在しない場合", async () => {
    mockRepo.findEventSongsWithReservations.mockResolvedValue(null);

    const result = await getEventSongs(mockRepo, "nonexistent-uuid");

    expect(result).toEqual({ status: "not-found" });
  });
});
