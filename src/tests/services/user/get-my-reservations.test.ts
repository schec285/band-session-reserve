import type { Mocked } from "vitest";
import { getMyReservations } from "@/server/services/user/my-reservations";
import type { IReservationRepository } from "@/server/repositories/reserve/reservation-repository";

const now = new Date();
const future1 = new Date(now.getTime() + 1000 * 60 * 60 * 24);
const future2 = new Date(now.getTime() + 1000 * 60 * 60 * 48);

const record1 = {
  reservationId: "res-uuid-1",
  eventSongId: "event-song-uuid-1",
  event: { id: "event-uuid-1", title: "春のバンドセッション", startAt: future1, venue: "渋谷スタジオ" },
  song: { title: "夜に駆ける", artist: "YOASOBI" },
  part: "vocal",
  isTransferable: false,
  createdAt: now,
};

const record2 = {
  reservationId: "res-uuid-2",
  eventSongId: "event-song-uuid-2",
  event: { id: "event-uuid-2", title: "夏のバンドセッション", startAt: future2, venue: "新宿スタジオ" },
  song: { title: "Subtitle", artist: "Official髭男dism" },
  part: "bass",
  isTransferable: true,
  createdAt: now,
};

let mockRepo: Mocked<IReservationRepository>;

beforeEach(() => {
  mockRepo = {
    findEventSongWithEvent: vi.fn(),
    countByUserIdAndEventIdAndParts: vi.fn(),
    findByEventSongIdAndPart: vi.fn(),
    findByUserIdAndEventSongId: vi.fn(),
    findById: vi.fn(),
    updateTransferable: vi.fn(),
    deleteById: vi.fn(),
    createMany: vi.fn(),
    findUpcomingByUserId: vi.fn(),
  };
});

describe("getMyReservations", () => {
  it("予約が2件ある場合、MyReservationItem[] に変換して全件返す", async () => {
    mockRepo.findUpcomingByUserId.mockResolvedValue([record1, record2]);

    const result = await getMyReservations(mockRepo, "user-uuid");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      reservationId: "res-uuid-1",
      eventSongId: "event-song-uuid-1",
      event: {
        id: "event-uuid-1",
        title: "春のバンドセッション",
        startAt: future1.toISOString(),
        venue: "渋谷スタジオ",
      },
      song: { title: "夜に駆ける", artist: "YOASOBI" },
      part: "vocal",
      isTransferable: false,
      createdAt: now.toISOString(),
    });
    expect(result[1]).toEqual({
      reservationId: "res-uuid-2",
      eventSongId: "event-song-uuid-2",
      event: {
        id: "event-uuid-2",
        title: "夏のバンドセッション",
        startAt: future2.toISOString(),
        venue: "新宿スタジオ",
      },
      song: { title: "Subtitle", artist: "Official髭男dism" },
      part: "bass",
      isTransferable: true,
      createdAt: now.toISOString(),
    });
  });

  it("予約が0件の場合、空配列を返す", async () => {
    mockRepo.findUpcomingByUserId.mockResolvedValue([]);

    const result = await getMyReservations(mockRepo, "user-uuid");

    expect(result).toEqual([]);
  });

  it("findUpcomingByUserId に userId が渡される", async () => {
    mockRepo.findUpcomingByUserId.mockResolvedValue([]);

    await getMyReservations(mockRepo, "user-uuid-123");

    expect(mockRepo.findUpcomingByUserId).toHaveBeenCalledWith("user-uuid-123");
  });
});
