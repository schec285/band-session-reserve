import type { Mocked } from "vitest";
import { createReservations } from "@/server/services/reserve/reservation";
import type { IReservationRepository } from "@/server/repositories/reserve/reservation-repository";

const now = new Date();
const future = new Date(now.getTime() + 1000 * 60 * 60);
const past = new Date(now.getTime() - 1000 * 60 * 60);

const openEventSong1 = {
  id: "event-song-uuid-1",
  parts: ["vocal", "drums"],
  event: { startAt: future, closedAt: null },
};

const openEventSong2 = {
  id: "event-song-uuid-2",
  parts: ["bass", "keyboard"],
  event: { startAt: future, closedAt: null },
};

const entry1 = { eventSongId: "event-song-uuid-1", part: "vocal", isTransferable: false };
const entry2 = { eventSongId: "event-song-uuid-2", part: "bass", isTransferable: false };

const baseParams = {
  userId: "user-uuid",
  snsConsent: true,
  comment: undefined as string | undefined,
};

let mockRepo: Mocked<IReservationRepository>;

beforeEach(() => {
  mockRepo = {
    findEventSongWithEvent: vi.fn(),
    findByEventSongIdAndPart: vi.fn(),
    findByUserIdAndEventSongId: vi.fn(),
    findById: vi.fn(),
    updatePartAndTransferable: vi.fn(),
    deleteById: vi.fn(),
    createMany: vi.fn(),
  };
  mockRepo.findEventSongWithEvent.mockImplementation(async (id) => {
    if (id === "event-song-uuid-1") return openEventSong1;
    if (id === "event-song-uuid-2") return openEventSong2;
    return null;
  });
  mockRepo.findByEventSongIdAndPart.mockResolvedValue(null);
  mockRepo.findByUserIdAndEventSongId.mockResolvedValue([]);
  mockRepo.createMany.mockResolvedValue(undefined);
});

describe("createReservations", () => {
  describe("正常系", () => {
    it("ok: 1件予約成功・createMany が呼ばれる", async () => {
      const result = await createReservations(mockRepo, { ...baseParams, entries: [entry1] });

      expect(result).toEqual({ status: "ok" });
      expect(mockRepo.createMany).toHaveBeenCalledWith([
        { userId: "user-uuid", eventSongId: "event-song-uuid-1", part: "vocal", snsConsent: true, isTransferable: false, comment: undefined },
      ]);
    });

    it("ok: 複数件予約成功・createMany に全件渡る", async () => {
      const result = await createReservations(mockRepo, { ...baseParams, entries: [entry1, entry2] });

      expect(result).toEqual({ status: "ok" });
      expect(mockRepo.createMany).toHaveBeenCalledWith([
        { userId: "user-uuid", eventSongId: "event-song-uuid-1", part: "vocal", snsConsent: true, isTransferable: false, comment: undefined },
        { userId: "user-uuid", eventSongId: "event-song-uuid-2", part: "bass", snsConsent: true, isTransferable: false, comment: undefined },
      ]);
    });

    it("ok: isTransferable: true のエントリーが createMany にそのまま渡る", async () => {
      const result = await createReservations(mockRepo, {
        ...baseParams,
        entries: [{ ...entry1, isTransferable: true }],
      });

      expect(result).toEqual({ status: "ok" });
      expect(mockRepo.createMany).toHaveBeenCalledWith([
        expect.objectContaining({ isTransferable: true }),
      ]);
    });

    it("ok: comment が全エントリーに共通で渡る", async () => {
      await createReservations(mockRepo, { ...baseParams, comment: "よろしくお願いします", entries: [entry1] });

      expect(mockRepo.createMany).toHaveBeenCalledWith([
        expect.objectContaining({ comment: "よろしくお願いします" }),
      ]);
    });
  });

  describe("異常系 — not-found", () => {
    it("not-found: イベント曲が存在しない場合は createMany を呼ばない", async () => {
      mockRepo.findEventSongWithEvent.mockResolvedValue(null);

      const result = await createReservations(mockRepo, { ...baseParams, entries: [entry1] });

      expect(result).toEqual({ status: "not-found" });
      expect(mockRepo.createMany).not.toHaveBeenCalled();
    });

    it("not-found: 複数件のうち1件でも存在しない場合は全件キャンセル", async () => {
      mockRepo.findEventSongWithEvent.mockImplementation(async (id) => {
        if (id === "event-song-uuid-1") return openEventSong1;
        return null;
      });

      const result = await createReservations(mockRepo, { ...baseParams, entries: [entry1, entry2] });

      expect(result).toEqual({ status: "not-found" });
      expect(mockRepo.createMany).not.toHaveBeenCalled();
    });
  });

  describe("異常系 — closed", () => {
    it("closed: startAt が過去（closedAt が null）の場合は createMany を呼ばない", async () => {
      mockRepo.findEventSongWithEvent.mockResolvedValue({
        ...openEventSong1,
        event: { startAt: past, closedAt: null },
      });

      const result = await createReservations(mockRepo, { ...baseParams, entries: [entry1] });

      expect(result).toEqual({ status: "closed" });
      expect(mockRepo.createMany).not.toHaveBeenCalled();
    });

    it("closed: closedAt が過去の場合は createMany を呼ばない", async () => {
      mockRepo.findEventSongWithEvent.mockResolvedValue({
        ...openEventSong1,
        event: { startAt: future, closedAt: past },
      });

      const result = await createReservations(mockRepo, { ...baseParams, entries: [entry1] });

      expect(result).toEqual({ status: "closed" });
      expect(mockRepo.createMany).not.toHaveBeenCalled();
    });
  });

  describe("異常系 — forbidden-combination", () => {
    it("forbidden-combination: 既存予約と禁止組み合わせになるパートは登録できない", async () => {
      mockRepo.findByUserIdAndEventSongId.mockResolvedValue([
        { id: "res-existing", userId: "user-uuid", eventSongId: "event-song-uuid-1", part: "readGuitar" },
      ]);

      const result = await createReservations(mockRepo, {
        ...baseParams,
        entries: [{ eventSongId: "event-song-uuid-1", part: "backingGuitar" }],
      });

      expect(result).toEqual({ status: "forbidden-combination" });
      expect(mockRepo.createMany).not.toHaveBeenCalled();
    });

    it("forbidden-combination: 複数件のうち1件でも禁止組み合わせなら全件キャンセル", async () => {
      mockRepo.findByUserIdAndEventSongId.mockImplementation(async (userId, eventSongId) => {
        if (eventSongId === "event-song-uuid-1") {
          return [{ id: "res-existing", userId: "user-uuid", eventSongId: "event-song-uuid-1", part: "readGuitar" }];
        }
        return [];
      });

      const result = await createReservations(mockRepo, {
        ...baseParams,
        entries: [
          entry2,
          { eventSongId: "event-song-uuid-1", part: "backingGuitar" },
        ],
      });

      expect(result).toEqual({ status: "forbidden-combination" });
      expect(mockRepo.createMany).not.toHaveBeenCalled();
    });

    it("ok: 禁止組み合わせでも曲が異なれば通る", async () => {
      mockRepo.findByUserIdAndEventSongId.mockImplementation(async (userId, eventSongId) => {
        if (eventSongId === "event-song-uuid-1") {
          return [{ id: "res-existing", userId: "user-uuid", eventSongId: "event-song-uuid-1", part: "readGuitar" }];
        }
        return [];
      });

      const result = await createReservations(mockRepo, {
        ...baseParams,
        entries: [{ eventSongId: "event-song-uuid-2", part: "backingGuitar" }],
      });

      expect(result).toEqual({ status: "ok" });
    });
  });

  describe("異常系 — filled", () => {
    it("filled: パートが埋まっている場合は createMany を呼ばない", async () => {
      mockRepo.findByEventSongIdAndPart.mockResolvedValue({ id: "existing-id" });

      const result = await createReservations(mockRepo, { ...baseParams, entries: [entry1] });

      expect(result).toEqual({ status: "filled" });
      expect(mockRepo.createMany).not.toHaveBeenCalled();
    });

    it("filled: 複数件のうち1件でもパートが埋まっていれば全件キャンセル", async () => {
      mockRepo.findByEventSongIdAndPart.mockImplementation(async (eventSongId) => {
        if (eventSongId === "event-song-uuid-2") return { id: "existing-id" };
        return null;
      });

      const result = await createReservations(mockRepo, { ...baseParams, entries: [entry1, entry2] });

      expect(result).toEqual({ status: "filled" });
      expect(mockRepo.createMany).not.toHaveBeenCalled();
    });
  });
});
