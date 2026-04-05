import { createReservation } from "@/server/services/reserve/reservation";
import type { IReservationRepository } from "@/server/repositories/reserve/reservation-repository";

const now = new Date();
const future = new Date(now.getTime() + 1000 * 60 * 60);
const past = new Date(now.getTime() - 1000 * 60 * 60);

const openEventSong = {
  id: "event-song-uuid",
  parts: ["vocal", "drums"],
  event: { startAt: future, closedAt: null },
};

const params = {
  userId: "user-uuid",
  eventSongId: "event-song-uuid",
  part: "vocal",
  snsConsent: true,
};

let mockRepo: jest.Mocked<IReservationRepository>;

beforeEach(() => {
  mockRepo = {
    findEventSongWithEvent: jest.fn(),
    findByEventSongIdAndPart: jest.fn(),
    create: jest.fn(),
  };
  mockRepo.findEventSongWithEvent.mockResolvedValue(openEventSong);
  mockRepo.findByEventSongIdAndPart.mockResolvedValue(null);
  mockRepo.create.mockResolvedValue(undefined);
});

describe("createReservation", () => {
  it("ok: 予約成功・create が呼ばれる", async () => {
    const result = await createReservation(mockRepo, params);

    expect(result).toEqual({ status: "ok" });
    expect(mockRepo.create).toHaveBeenCalledWith({
      userId: "user-uuid",
      eventSongId: "event-song-uuid",
      part: "vocal",
      snsConsent: true,
      comment: undefined,
    });
  });

  it("not-found: イベント曲が存在しない", async () => {
    mockRepo.findEventSongWithEvent.mockResolvedValue(null);

    const result = await createReservation(mockRepo, params);
    expect(result).toEqual({ status: "not-found" });
  });

  it("closed: startAt が過去（closedAt が null）", async () => {
    mockRepo.findEventSongWithEvent.mockResolvedValue({
      ...openEventSong,
      event: { startAt: past, closedAt: null },
    });

    const result = await createReservation(mockRepo, params);
    expect(result).toEqual({ status: "closed" });
  });

  it("closed: closedAt が過去", async () => {
    mockRepo.findEventSongWithEvent.mockResolvedValue({
      ...openEventSong,
      event: { startAt: future, closedAt: past },
    });

    const result = await createReservation(mockRepo, params);
    expect(result).toEqual({ status: "closed" });
  });

  it("filled: パートがすでに予約済み", async () => {
    mockRepo.findByEventSongIdAndPart.mockResolvedValue({ id: "existing-reservation-id" });

    const result = await createReservation(mockRepo, params);
    expect(result).toEqual({ status: "filled" });
  });
});
