import type { Mocked } from "vitest";
import { createSong, addEventSong, deleteEventSong, getAllSongs } from "@/server/services/admin/songs";
import type { ISongRepository } from "@/server/repositories/songs/song-repository";
import type { Part } from "@drizzle/schema/enums";

const mockSongRecord = {
  id: "song-uuid-1",
  title: "千本桜",
  artist: "黒うさP",
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
    createSong: vi.fn(),
    addEventSong: vi.fn(),
    deleteEventSong: vi.fn(),
    updateEventSongParts: vi.fn(),
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
// createSong
// ---------------------------------------------------------------------------

describe("createSong", () => {
  it("ok: 作成した曲を返す", async () => {
    mockRepo.createSong.mockResolvedValue(mockSongRecord);

    const result = await createSong(mockRepo, { title: "千本桜", artist: "黒うさP" });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.song.id).toBe("song-uuid-1");
    expect(result.song.title).toBe("千本桜");
    expect(result.song.artist).toBe("黒うさP");
  });

  it("リポジトリに正しい入力を渡す", async () => {
    mockRepo.createSong.mockResolvedValue(mockSongRecord);

    await createSong(mockRepo, { title: "千本桜", artist: "黒うさP" });

    expect(mockRepo.createSong).toHaveBeenCalledWith({
      title: "千本桜",
      artist: "黒うさP",
    });
  });
});

// ---------------------------------------------------------------------------
// addEventSong
// ---------------------------------------------------------------------------

describe("addEventSong", () => {
  it("ok: イベントに追加した曲を返す", async () => {
    mockRepo.addEventSong.mockResolvedValue(mockEventSongRecord);

    const result = await addEventSong(mockRepo, "event-uuid-1", {
      songId: "song-uuid-1",
      parts: ["vocal", "drums"],
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.eventSong.eventSongId).toBe("event-song-uuid-1");
    expect(result.eventSong.parts).toEqual(["vocal", "drums"]);
  });

  it("リポジトリに正しい入力を渡す", async () => {
    mockRepo.addEventSong.mockResolvedValue(mockEventSongRecord);

    await addEventSong(mockRepo, "event-uuid-1", {
      songId: "song-uuid-1",
      parts: ["vocal", "drums"],
    });

    expect(mockRepo.addEventSong).toHaveBeenCalledWith({
      eventId: "event-uuid-1",
      songId: "song-uuid-1",
      parts: ["vocal", "drums"],
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
