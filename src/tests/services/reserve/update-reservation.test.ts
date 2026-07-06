import type { Mocked } from "vitest";
import { updateTransferable } from "@/server/services/reserve/reservation";
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
  event: { id: "event-uuid", startAt: future, closedAt: null, vocalEntryLimit: null, instrumentEntryLimit: null },
};

const params = {
  reservationId: "reservation-uuid",
  userId: "user-uuid",
  isTransferable: true,
};

let mockRepo: Mocked<IReservationRepository>;

beforeEach(() => {
  mockRepo = {
    findEventSongWithEvent: vi.fn(),
    findUpcomingByUserId: vi.fn(),
    countByUserIdAndEventIdAndParts: vi.fn(),
    findByEventSongIdAndPart: vi.fn(),
    findByUserIdAndEventSongId: vi.fn(),
    findById: vi.fn(),
    updateTransferable: vi.fn(),
    deleteById: vi.fn(),
    takeoverReservation: vi.fn(),
    createMany: vi.fn(),
  };
  mockRepo.findById.mockResolvedValue(existingReservation);
  mockRepo.findEventSongWithEvent.mockResolvedValue(openEventSong);
  mockRepo.updateTransferable.mockResolvedValue(undefined);
});

describe("updateTransferable", () => {
  it("ok: 譲渡可能に更新成功・updateTransferable が呼ばれる", async () => {
    const result = await updateTransferable(mockRepo, params);

    expect(result).toEqual({ status: "ok" });
    expect(mockRepo.updateTransferable).toHaveBeenCalledWith("reservation-uuid", true);
  });

  it("ok: 譲渡不可に更新成功", async () => {
    const result = await updateTransferable(mockRepo, { ...params, isTransferable: false });

    expect(result).toEqual({ status: "ok" });
    expect(mockRepo.updateTransferable).toHaveBeenCalledWith("reservation-uuid", false);
  });

  it("not-found: 予約が存在しない", async () => {
    mockRepo.findById.mockResolvedValue(null);

    const result = await updateTransferable(mockRepo, params);
    expect(result).toEqual({ status: "not-found" });
  });

  it("forbidden: 他ユーザーの予約", async () => {
    mockRepo.findById.mockResolvedValue({ ...existingReservation, userId: "other-user-uuid" });

    const result = await updateTransferable(mockRepo, params);
    expect(result).toEqual({ status: "forbidden" });
  });

  it("closed: startAt が過去（closedAt が null）", async () => {
    mockRepo.findEventSongWithEvent.mockResolvedValue({
      ...openEventSong,
      event: { id: "event-uuid", startAt: past, closedAt: null, vocalEntryLimit: null, instrumentEntryLimit: null },
    });

    const result = await updateTransferable(mockRepo, params);
    expect(result).toEqual({ status: "closed" });
  });

  it("closed: closedAt が過去", async () => {
    mockRepo.findEventSongWithEvent.mockResolvedValue({
      ...openEventSong,
      event: { id: "event-uuid", startAt: future, closedAt: past, vocalEntryLimit: null, instrumentEntryLimit: null },
    });

    const result = await updateTransferable(mockRepo, params);
    expect(result).toEqual({ status: "closed" });
  });
});
