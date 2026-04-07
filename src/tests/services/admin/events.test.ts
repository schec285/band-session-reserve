import type { Mocked } from "vitest";
import { createEvent, updateEvent, deleteEvent } from "@/server/services/admin/events";
import type { IEventRepository } from "@/server/repositories/events/event-repository";

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
  description: "春のセッションです",
};

const validInput = {
  title: "春のセッション",
  startAt: future.toISOString(),
  endAt: futureEnd.toISOString(),
  closedAt: null,
  venue: "渋谷スタジオ A",
  description: "春のセッションです",
};

let mockRepo: Mocked<IEventRepository>;

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
    expect(typeof result.event.startAt).toBe("string");
    expect(typeof result.event.endAt).toBe("string");
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
    expect(typeof result.event.closedAt).toBe("string");
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
      description: validInput.description,
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
    expect(typeof result.event.startAt).toBe("string");
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
      description: validInput.description,
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
