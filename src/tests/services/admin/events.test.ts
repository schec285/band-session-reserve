import type { Mocked } from "vitest";
import { createEvent, updateEvent, deleteEvent, getEventForEdit } from "@/server/services/admin/events";
import type { IAdminEventRepository } from "@/server/repositories/admin/event-repository";

const now = new Date();
const future = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7); // 7日後
const futureEnd = new Date(future.getTime() + 1000 * 60 * 60 * 3); // 開始3時間後
const closedAt = new Date(future.getTime() - 1000 * 60 * 60 * 24); // 1日前

const mockEventRecord = {
  id: "event-uuid-1",
  title: "春のセッション",
  startAt: future,
  endAt: futureEnd,
  closedAt: null,
  venue: "渋谷スタジオ A",
  venueFee: 3000,
  participationFee: 500,
  description: "春のセッションです",
  vocalEntryLimit: null,
  instrumentEntryLimit: null,
};

const validInput = {
  title: "春のセッション",
  startAt: future.toISOString(),
  endAt: futureEnd.toISOString(),
  closedAt: null,
  venue: "渋谷スタジオ A",
  venueFee: 3000,
  participationFee: 500,
  description: "春のセッションです",
  vocalEntryLimit: null,
  instrumentEntryLimit: null,
};

const mockSongs = [
  {
    id: "song-uuid-1",
    eventSongId: "event-song-uuid-1",
    title: "千本桜",
    artist: "黒うさP",
    reservations: [
      { part: "vocal",      username: "yamada_taro" },
      { part: "drums",      username: null },
      { part: "bass",       username: null },
    ],
  },
];

let mockRepo: Mocked<IAdminEventRepository>;

beforeEach(() => {
  mockRepo = {
    findAllEvents: vi.fn(),
    findEventById: vi.fn(),
    findEventSongsWithReservations: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// createEvent
// ---------------------------------------------------------------------------

describe("createEvent", () => {
  it("ok: 作成したイベントを ISO 8601 文字列で返す", async () => {
    mockRepo.createEvent.mockResolvedValue(mockEventRecord);

    const result = await createEvent(mockRepo, validInput);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.event.id).toBe("event-uuid-1");
    expect(result.event.title).toBe("春のセッション");
    expect(result.event.venueFee).toBe(3000);
    expect(result.event.participationFee).toBe(500);
    expect(result.event.startAt).toMatch(/\+09:00$/);
    expect(result.event.endAt).toMatch(/\+09:00$/);
    expect(result.event.closedAt).toBeNull();
  });

  it("ok: closedAt が指定された場合は ISO 8601 文字列で返す", async () => {
    mockRepo.createEvent.mockResolvedValue({ ...mockEventRecord, closedAt });

    const result = await createEvent(mockRepo, {
      ...validInput,
      closedAt: closedAt.toISOString(),
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.event.closedAt).toMatch(/\+09:00$/);
  });

  it("リポジトリに正しい Date オブジェクトを渡す", async () => {
    mockRepo.createEvent.mockResolvedValue(mockEventRecord);

    await createEvent(mockRepo, validInput);

    expect(mockRepo.createEvent).toHaveBeenCalledWith({
      title: validInput.title,
      startAt: new Date(validInput.startAt),
      endAt: new Date(validInput.endAt),
      closedAt: null,
      venue: validInput.venue,
      venueFee: 3000,
      participationFee: 500,
      description: validInput.description,
      vocalEntryLimit: null,
      instrumentEntryLimit: null,
    });
  });
});

// ---------------------------------------------------------------------------
// updateEvent
// ---------------------------------------------------------------------------

describe("updateEvent", () => {
  it("ok: 更新後のイベントを ISO 8601 文字列で返す", async () => {
    mockRepo.updateEvent.mockResolvedValue({
      ...mockEventRecord,
      title: "更新後タイトル",
    });

    const result = await updateEvent(mockRepo, "event-uuid-1", {
      ...validInput,
      title: "更新後タイトル",
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.event.title).toBe("更新後タイトル");
    expect(result.event.startAt).toMatch(/\+09:00$/);
  });

  it("not-found: イベントが存在しない場合", async () => {
    mockRepo.updateEvent.mockResolvedValue(null);

    const result = await updateEvent(mockRepo, "nonexistent-uuid", validInput);

    expect(result.status).toBe("not-found");
  });

  it("リポジトリに正しい eventId と Date オブジェクトを渡す", async () => {
    mockRepo.updateEvent.mockResolvedValue(mockEventRecord);

    await updateEvent(mockRepo, "event-uuid-1", validInput);

    expect(mockRepo.updateEvent).toHaveBeenCalledWith("event-uuid-1", {
      title: validInput.title,
      startAt: new Date(validInput.startAt),
      endAt: new Date(validInput.endAt),
      closedAt: null,
      venue: validInput.venue,
      venueFee: 3000,
      participationFee: 500,
      description: validInput.description,
      vocalEntryLimit: null,
      instrumentEntryLimit: null,
    });
  });
});

// ---------------------------------------------------------------------------
// deleteEvent
// ---------------------------------------------------------------------------

describe("deleteEvent", () => {
  it("ok: 削除成功", async () => {
    mockRepo.deleteEvent.mockResolvedValue(true);

    const result = await deleteEvent(mockRepo, "event-uuid-1");

    expect(result.status).toBe("ok");
    expect(mockRepo.deleteEvent).toHaveBeenCalledWith("event-uuid-1");
  });

  it("not-found: イベントが存在しない場合", async () => {
    mockRepo.deleteEvent.mockResolvedValue(false);

    const result = await deleteEvent(mockRepo, "nonexistent-uuid");

    expect(result.status).toBe("not-found");
  });
});

// ---------------------------------------------------------------------------
// getEventForEdit
// ---------------------------------------------------------------------------

describe("getEventForEdit", () => {
  it("ok: イベント情報と曲一覧（parts に変換済み）を返す", async () => {
    mockRepo.findEventById.mockResolvedValue(mockEventRecord);
    mockRepo.findEventSongsWithReservations.mockResolvedValue(mockSongs);

    const result = await getEventForEdit(mockRepo, "event-uuid-1");

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.event.id).toBe("event-uuid-1");
    expect(result.event.venueFee).toBe(3000);
    expect(result.event.participationFee).toBe(500);
    expect(result.event.startAt).toMatch(/\+09:00$/);
    expect(result.songs[0]).toEqual({
      eventSongId: "event-song-uuid-1",
      songId: "song-uuid-1",
      title: "千本桜",
      artist: "黒うさP",
      parts: ["vocal", "drums", "bass"],
    });
  });

  it("ok: 曲が 0 件の場合は songs が空配列", async () => {
    mockRepo.findEventById.mockResolvedValue(mockEventRecord);
    mockRepo.findEventSongsWithReservations.mockResolvedValue([]);

    const result = await getEventForEdit(mockRepo, "event-uuid-1");

    expect(result).toMatchObject({ status: "ok", songs: [] });
  });

  it("not-found: イベントが存在しない場合", async () => {
    mockRepo.findEventById.mockResolvedValue(null);

    const result = await getEventForEdit(mockRepo, "nonexistent-uuid");

    expect(result).toEqual({ status: "not-found" });
  });
});
