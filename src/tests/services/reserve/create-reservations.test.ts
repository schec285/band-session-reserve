import type { Mocked } from "vitest";
import { createReservations } from "@/server/services/reserve/reservation";
import type { IReservationRepository } from "@/server/repositories/reserve/reservation-repository";

const now = new Date();
const future = new Date(now.getTime() + 1000 * 60 * 60);
const past = new Date(now.getTime() - 1000 * 60 * 60);

const openEventSong1 = {
  id: "event-song-uuid-1",
  parts: ["vocal", "drums"],
  event: { id: "event-uuid-1", startAt: future, closedAt: null, vocalEntryLimit: null, instrumentEntryLimit: null },
};

const openEventSong2 = {
  id: "event-song-uuid-2",
  parts: ["bass", "keyboard"],
  event: { id: "event-uuid-1", startAt: future, closedAt: null, vocalEntryLimit: null, instrumentEntryLimit: null },
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
    countByUserIdAndEventIdAndParts: vi.fn(),
    findByEventSongIdAndPart: vi.fn(),
    findByUserIdAndEventSongId: vi.fn(),
    findById: vi.fn(),
    updateTransferable: vi.fn(),
    deleteById: vi.fn(),
    createMany: vi.fn(),
  };
  mockRepo.countByUserIdAndEventIdAndParts.mockResolvedValue(0);
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
        event: { id: "event-uuid-1", startAt: past, closedAt: null, vocalEntryLimit: null, instrumentEntryLimit: null },
      });

      const result = await createReservations(mockRepo, { ...baseParams, entries: [entry1] });

      expect(result).toEqual({ status: "closed" });
      expect(mockRepo.createMany).not.toHaveBeenCalled();
    });

    it("closed: closedAt が過去の場合は createMany を呼ばない", async () => {
      mockRepo.findEventSongWithEvent.mockResolvedValue({
        ...openEventSong1,
        event: { id: "event-uuid-1", startAt: future, closedAt: past, vocalEntryLimit: null, instrumentEntryLimit: null },
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

  describe("異常系 — entry-limit-exceeded", () => {
    it("entry-limit-exceeded: ボーカル系上限に達している場合は createMany を呼ばない", async () => {
      const limitedEventSong = {
        ...openEventSong1,
        event: { id: "event-uuid-1", startAt: future, closedAt: null, vocalEntryLimit: 3, instrumentEntryLimit: null },
      };
      mockRepo.findEventSongWithEvent.mockResolvedValue(limitedEventSong);
      mockRepo.countByUserIdAndEventIdAndParts.mockResolvedValue(3);

      const result = await createReservations(mockRepo, { ...baseParams, entries: [entry1] });

      expect(result).toEqual({ status: "entry-limit-exceeded" });
      expect(mockRepo.createMany).not.toHaveBeenCalled();
    });

    it("entry-limit-exceeded: 楽器系上限に達している場合は createMany を呼ばない", async () => {
      const limitedEventSong = {
        ...openEventSong2,
        event: { id: "event-uuid-1", startAt: future, closedAt: null, vocalEntryLimit: null, instrumentEntryLimit: 4 },
      };
      mockRepo.findEventSongWithEvent.mockResolvedValue(limitedEventSong);
      mockRepo.countByUserIdAndEventIdAndParts.mockResolvedValue(4);

      const result = await createReservations(mockRepo, { ...baseParams, entries: [entry2] });

      expect(result).toEqual({ status: "entry-limit-exceeded" });
      expect(mockRepo.createMany).not.toHaveBeenCalled();
    });

    it("entry-limit-exceeded: バッチ内の合算でも上限超過を検出する", async () => {
      const limitedEventSong1 = {
        ...openEventSong1,
        event: { id: "event-uuid-1", startAt: future, closedAt: null, vocalEntryLimit: 3, instrumentEntryLimit: null },
      };
      const limitedEventSong2 = {
        ...openEventSong2,
        event: { id: "event-uuid-1", startAt: future, closedAt: null, vocalEntryLimit: 3, instrumentEntryLimit: null },
      };
      mockRepo.findEventSongWithEvent.mockImplementation(async (id) => {
        if (id === "event-song-uuid-1") return limitedEventSong1;
        if (id === "event-song-uuid-2") return limitedEventSong2;
        return null;
      });
      // DB に既存 2 件、バッチで 2 件追加 → 合計 4 件 > 上限 3
      mockRepo.countByUserIdAndEventIdAndParts.mockResolvedValue(2);

      const result = await createReservations(mockRepo, {
        ...baseParams,
        entries: [
          { eventSongId: "event-song-uuid-1", part: "vocal", isTransferable: false },
          { eventSongId: "event-song-uuid-2", part: "chorus", isTransferable: false },
        ],
      });

      expect(result).toEqual({ status: "entry-limit-exceeded" });
      expect(mockRepo.createMany).not.toHaveBeenCalled();
    });

    it("ok: DB既存 + バッチ合算が上限以内なら通る", async () => {
      const limitedEventSong = {
        ...openEventSong1,
        event: { id: "event-uuid-1", startAt: future, closedAt: null, vocalEntryLimit: 3, instrumentEntryLimit: null },
      };
      mockRepo.findEventSongWithEvent.mockResolvedValue(limitedEventSong);
      // DB に既存 2 件、バッチで 1 件 → 合計 3 件 = 上限 3（OK）
      mockRepo.countByUserIdAndEventIdAndParts.mockResolvedValue(2);

      const result = await createReservations(mockRepo, { ...baseParams, entries: [entry1] });

      expect(result).toEqual({ status: "ok" });
    });

    it("ok: vocalEntryLimit が null なら制限なし", async () => {
      const unlimitedEventSong = {
        ...openEventSong1,
        event: { id: "event-uuid-1", startAt: future, closedAt: null, vocalEntryLimit: null, instrumentEntryLimit: null },
      };
      mockRepo.findEventSongWithEvent.mockResolvedValue(unlimitedEventSong);
      mockRepo.countByUserIdAndEventIdAndParts.mockResolvedValue(999);

      const result = await createReservations(mockRepo, { ...baseParams, entries: [entry1] });

      expect(result).toEqual({ status: "ok" });
    });

    it("ok: ボーカル系上限超過でも楽器系は独立して判定される", async () => {
      const eventSong1WithLimit = {
        ...openEventSong1,
        event: { id: "event-uuid-1", startAt: future, closedAt: null, vocalEntryLimit: 1, instrumentEntryLimit: 5 },
      };
      const eventSong2WithLimit = {
        ...openEventSong2,
        event: { id: "event-uuid-1", startAt: future, closedAt: null, vocalEntryLimit: 1, instrumentEntryLimit: 5 },
      };
      mockRepo.findEventSongWithEvent.mockImplementation(async (id) => {
        if (id === "event-song-uuid-1") return eventSong1WithLimit;
        if (id === "event-song-uuid-2") return eventSong2WithLimit;
        return null;
      });
      // vocal は上限 1 に対し DB 0 件 + バッチ 1 件 = ちょうど 1（OK）
      // instrument は DB 2 件 + バッチ 1 件 = 3 ≤ 5（OK）
      mockRepo.countByUserIdAndEventIdAndParts.mockResolvedValue(0);

      const result = await createReservations(mockRepo, { ...baseParams, entries: [entry1, entry2] });

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
