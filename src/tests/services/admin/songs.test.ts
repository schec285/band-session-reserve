import type { Mocked } from "vitest";
import {
  createSongs,
  addEventSongs,
  deleteEventSong,
  deleteEventSongs,
  getAllSongs,
  removeReservation,
} from "@/server/services/admin/songs";
import type { ISongRepository } from "@/server/repositories/songs/song-repository";
import type { Part } from "@drizzle/schema/enums";

const mockSongRecord = {
  id: "song-uuid-1",
  title: "千本桜",
  artist: "黒うさP",
};

const mockSongRecord2 = {
  id: "song-uuid-2",
  title: "打上花火",
  artist: "DAOKO×米津玄師",
};

const mockEventSongRecord = {
  eventSongId: "event-song-uuid-1",
  songId: "song-uuid-1",
  title: "千本桜",
  artist: "黒うさP",
  parts: ["vocal", "drums"] as Part[],
};

let mockRepo: Mocked<ISongRepository>;

beforeEach(() => {
  mockRepo = {
    findAllSongs: vi.fn(),
    findSongById: vi.fn(),
    createSongs: vi.fn(),
    addEventSongs: vi.fn(),
    deleteEventSong: vi.fn(),
    deleteEventSongs: vi.fn(),
    updateEventSongParts: vi.fn(),
    removeReservation: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// getAllSongs
// ---------------------------------------------------------------------------

describe("getAllSongs", () => {
  it("ok: 全曲一覧を返す", async () => {
    mockRepo.findAllSongs.mockResolvedValue([mockSongRecord]);

    const result = await getAllSongs(mockRepo);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("song-uuid-1");
    expect(result[0].title).toBe("千本桜");
    expect(result[0].artist).toBe("黒うさP");
  });

  it("曲が0件の場合は空配列を返す", async () => {
    mockRepo.findAllSongs.mockResolvedValue([]);

    const result = await getAllSongs(mockRepo);

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// createSongs
// ---------------------------------------------------------------------------

describe("createSongs", () => {
  it("ok: 作成した曲一覧を返す", async () => {
    mockRepo.createSongs.mockResolvedValue([mockSongRecord]);

    const result = await createSongs(mockRepo, { songs: [{ title: "千本桜", artist: "黒うさP" }] });

    expect(result.status).toBe("ok");
    expect(result.songs).toHaveLength(1);
    expect(result.songs[0].id).toBe("song-uuid-1");
    expect(result.songs[0].title).toBe("千本桜");
    expect(result.songs[0].artist).toBe("黒うさP");
  });

  it("ok: 複数件まとめて作成できる", async () => {
    mockRepo.createSongs.mockResolvedValue([mockSongRecord, mockSongRecord2]);

    const result = await createSongs(mockRepo, {
      songs: [
        { title: "千本桜", artist: "黒うさP" },
        { title: "打上花火", artist: "DAOKO×米津玄師" },
      ],
    });

    expect(result.status).toBe("ok");
    expect(result.songs).toHaveLength(2);
    expect(result.songs.map((s) => s.id)).toEqual(["song-uuid-1", "song-uuid-2"]);
  });

  it("リポジトリに正しい入力を渡す", async () => {
    mockRepo.createSongs.mockResolvedValue([mockSongRecord]);

    await createSongs(mockRepo, { songs: [{ title: "千本桜", artist: "黒うさP" }] });

    expect(mockRepo.createSongs).toHaveBeenCalledWith([{ title: "千本桜", artist: "黒うさP" }]);
  });
});

// ---------------------------------------------------------------------------
// addEventSongs
// ---------------------------------------------------------------------------

describe("addEventSongs", () => {
  it("ok: イベントに追加した曲一覧を返す", async () => {
    mockRepo.addEventSongs.mockResolvedValue([mockEventSongRecord]);

    const result = await addEventSongs(mockRepo, "event-uuid-1", {
      songs: [{ songId: "song-uuid-1", parts: ["vocal", "drums"] }],
    });

    expect(result.status).toBe("ok");
    expect(result.eventSongs).toHaveLength(1);
    expect(result.eventSongs[0].eventSongId).toBe("event-song-uuid-1");
    expect(result.eventSongs[0].parts).toEqual(["vocal", "drums"]);
  });

  it("リポジトリに正しい入力を渡す", async () => {
    mockRepo.addEventSongs.mockResolvedValue([mockEventSongRecord]);

    await addEventSongs(mockRepo, "event-uuid-1", {
      songs: [{ songId: "song-uuid-1", parts: ["vocal", "drums"] }],
    });

    expect(mockRepo.addEventSongs).toHaveBeenCalledWith({
      eventId: "event-uuid-1",
      songs: [{ songId: "song-uuid-1", parts: ["vocal", "drums"] }],
    });
  });

  it("ok: 同一イベントに同じ曲を複数回追加できる", async () => {
    mockRepo.addEventSongs.mockResolvedValue([mockEventSongRecord, mockEventSongRecord]);

    const result = await addEventSongs(mockRepo, "event-uuid-1", {
      songs: [
        { songId: "song-uuid-1", parts: ["vocal"] },
        { songId: "song-uuid-1", parts: ["drums"] },
      ],
    });

    expect(result.status).toBe("ok");
    expect(result.eventSongs).toHaveLength(2);
    expect(mockRepo.addEventSongs).toHaveBeenCalledWith({
      eventId: "event-uuid-1",
      songs: [
        { songId: "song-uuid-1", parts: ["vocal"] },
        { songId: "song-uuid-1", parts: ["drums"] },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// deleteEventSong
// ---------------------------------------------------------------------------

describe("deleteEventSong", () => {
  it("ok: 削除成功", async () => {
    mockRepo.deleteEventSong.mockResolvedValue(true);

    const result = await deleteEventSong(mockRepo, "event-song-uuid-1");

    expect(result.status).toBe("ok");
    expect(mockRepo.deleteEventSong).toHaveBeenCalledWith("event-song-uuid-1");
  });

  it("not-found: イベント曲が存在しない場合", async () => {
    mockRepo.deleteEventSong.mockResolvedValue(false);

    const result = await deleteEventSong(mockRepo, "nonexistent-uuid");

    expect(result.status).toBe("not-found");
  });
});

// ---------------------------------------------------------------------------
// deleteEventSongs
// ---------------------------------------------------------------------------

describe("deleteEventSongs", () => {
  it("ok: 削除できた eventSongId 一覧を返す", async () => {
    mockRepo.deleteEventSongs.mockResolvedValue(["event-song-uuid-1", "event-song-uuid-2"]);

    const result = await deleteEventSongs(mockRepo, "event-uuid-1", [
      "event-song-uuid-1",
      "event-song-uuid-2",
    ]);

    expect(result.status).toBe("ok");
    expect(result.deletedEventSongIds).toEqual(["event-song-uuid-1", "event-song-uuid-2"]);
    expect(mockRepo.deleteEventSongs).toHaveBeenCalledWith("event-uuid-1", [
      "event-song-uuid-1",
      "event-song-uuid-2",
    ]);
  });

  it("一部が存在しない場合も、削除できた分だけを返す", async () => {
    mockRepo.deleteEventSongs.mockResolvedValue(["event-song-uuid-1"]);

    const result = await deleteEventSongs(mockRepo, "event-uuid-1", [
      "event-song-uuid-1",
      "nonexistent-uuid",
    ]);

    expect(result.status).toBe("ok");
    expect(result.deletedEventSongIds).toEqual(["event-song-uuid-1"]);
  });
});

// ---------------------------------------------------------------------------
// removeReservation
// ---------------------------------------------------------------------------

describe("removeReservation", () => {
  it("ok: エントリー（予約）の削除成功", async () => {
    mockRepo.removeReservation.mockResolvedValue(true);

    const result = await removeReservation(mockRepo, "event-song-uuid-1", "vocal");

    expect(result.status).toBe("ok");
    expect(mockRepo.removeReservation).toHaveBeenCalledWith("event-song-uuid-1", "vocal");
  });

  it("not-found: エントリーが存在しない場合", async () => {
    mockRepo.removeReservation.mockResolvedValue(false);

    const result = await removeReservation(mockRepo, "event-song-uuid-1", "vocal");

    expect(result.status).toBe("not-found");
  });
});
