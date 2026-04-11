import type { Mocked } from "vitest";
import { updateReservationPart } from "@/server/services/reserve/reservation";
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
  part: "drums",
  isTransferable: false,
};

let mockRepo: Mocked<IReservationRepository>;

beforeEach(() => {
  mockRepo = {
    findEventSongWithEvent: vi.fn(),
    findByEventSongIdAndPart: vi.fn(),
    findById: vi.fn(),
    updatePartAndTransferable: vi.fn(),
    deleteById: vi.fn(),
    createMany: vi.fn(),
  };
  mockRepo.findById.mockResolvedValue(existingReservation);
  mockRepo.findEventSongWithEvent.mockResolvedValue(openEventSong);
  mockRepo.findByEventSongIdAndPart.mockResolvedValue(null);
  mockRepo.updatePartAndTransferable.mockResolvedValue(undefined);
});

describe("updateReservationPart", () => {
  it("ok: 更新成功・updatePartAndTransferable が呼ばれる", async () => {
    const result = await updateReservationPart(mockRepo, params);

    expect(result).toEqual({ status: "ok" });
    expect(mockRepo.updatePartAndTransferable).toHaveBeenCalledWith("reservation-uuid", "drums", false);
  });

  it("ok: isTransferable: true で更新成功", async () => {
    const result = await updateReservationPart(mockRepo, { ...params, isTransferable: true });

    expect(result).toEqual({ status: "ok" });
    expect(mockRepo.updatePartAndTransferable).toHaveBeenCalledWith("reservation-uuid", "drums", true);
  });

  it("not-found: 予約が存在しない", async () => {
    mockRepo.findById.mockResolvedValue(null);

    const result = await updateReservationPart(mockRepo, params);
    expect(result).toEqual({ status: "not-found" });
  });

  it("forbidden: 他ユーザーの予約", async () => {
    mockRepo.findById.mockResolvedValue({ ...existingReservation, userId: "other-user-uuid" });

    const result = await updateReservationPart(mockRepo, params);
    expect(result).toEqual({ status: "forbidden" });
  });

  it("closed: startAt が過去（closedAt が null）", async () => {
    mockRepo.findEventSongWithEvent.mockResolvedValue({
      ...openEventSong,
      event: { startAt: past, closedAt: null },
    });

    const result = await updateReservationPart(mockRepo, params);
    expect(result).toEqual({ status: "closed" });
  });

  it("closed: closedAt が過去", async () => {
    mockRepo.findEventSongWithEvent.mockResolvedValue({
      ...openEventSong,
      event: { startAt: future, closedAt: past },
    });

    const result = await updateReservationPart(mockRepo, params);
    expect(result).toEqual({ status: "closed" });
  });

  it("filled: 変更後のパートが埋まっている", async () => {
    mockRepo.findByEventSongIdAndPart.mockResolvedValue({ id: "other-reservation-uuid" });

    const result = await updateReservationPart(mockRepo, params);
    expect(result).toEqual({ status: "filled" });
  });
});
