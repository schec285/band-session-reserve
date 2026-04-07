import type { Mocked } from "vitest";
import { cancelReservation } from "@/server/services/reserve/reservation";
import type { IReservationRepository } from "@/server/repositories/reserve/reservation-repository";

const now = new Date();
const future = new Date(now.getTime() + 1000 * 60 * 60);
const past = new Date(now.getTime() - 1000 * 60 * 60);

const existingReservation = {
  id: "reservation-uuid",
  userId: "user-uuid",
  eventSongId: "event-song-uuid",
  part: "vocal",
};

const openEventSong = {
  id: "event-song-uuid",
  parts: ["vocal", "drums"],
  event: { startAt: future, closedAt: null },
};

const params = {
  reservationId: "reservation-uuid",
  userId: "user-uuid",
};

let mockRepo: Mocked<IReservationRepository>;

beforeEach(() => {
  mockRepo = {
    findEventSongWithEvent: vi.fn(),
    findByEventSongIdAndPart: vi.fn(),
    findById: vi.fn(),
    updatePart: vi.fn(),
    create: vi.fn(),
    deleteById: vi.fn(),
  };
  mockRepo.findById.mockResolvedValue(existingReservation);
  mockRepo.findEventSongWithEvent.mockResolvedValue(openEventSong);
  mockRepo.deleteById.mockResolvedValue(undefined);
});

describe("cancelReservation", () => {
  it("ok: キャンセル成功・deleteById が呼ばれる", async () => {
    const result = await cancelReservation(mockRepo, params);

    expect(result).toEqual({ status: "ok" });
    expect(mockRepo.deleteById).toHaveBeenCalledWith("reservation-uuid");
  });

  it("not-found: 予約が存在しない", async () => {
    mockRepo.findById.mockResolvedValue(null);

    const result = await cancelReservation(mockRepo, params);
    expect(result).toEqual({ status: "not-found" });
  });

  it("forbidden: 他ユーザーの予約", async () => {
    mockRepo.findById.mockResolvedValue({ ...existingReservation, userId: "other-user-uuid" });

    const result = await cancelReservation(mockRepo, params);
    expect(result).toEqual({ status: "forbidden" });
  });

  it("closed: startAt が過去（closedAt が null）", async () => {
    mockRepo.findEventSongWithEvent.mockResolvedValue({
      ...openEventSong,
      event: { startAt: past, closedAt: null },
    });

    const result = await cancelReservation(mockRepo, params);
    expect(result).toEqual({ status: "closed" });
  });

  it("closed: closedAt が過去", async () => {
    mockRepo.findEventSongWithEvent.mockResolvedValue({
      ...openEventSong,
      event: { startAt: future, closedAt: past },
    });

    const result = await cancelReservation(mockRepo, params);
    expect(result).toEqual({ status: "closed" });
  });
});
