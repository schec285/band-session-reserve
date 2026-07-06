import type { Mocked } from "vitest";
import {
  createSong,
  addEventSongs,
  deleteEventSong,
  deleteEventSongs,
  getAllSongs,
} from "@/server/services/admin/songs";
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
    findSongIdsByEventId: vi.fn(),
    addEventSongs: vi.fn(),
    deleteEventSong: vi.fn(),
    deleteEventSongs: vi.fn(),
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
// addEventSongs
// ---------------------------------------------------------------------------

describe("addEventSongs", () => {
  it("ok: イベントに追加した曲一覧を返す", async () => {
    mockRepo.findSongIdsByEventId.mockResolvedValue([]);
    mockRepo.addEventSongs.mockResolvedValue([mockEventSongRecord]);

    const result = await addEventSongs(mockRepo, "event-uuid-1", {
      songs: [{ songId: "song-uuid-1", parts: ["vocal", "drums"] }],
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.eventSongs).toHaveLength(1);
    expect(result.eventSongs[0].eventSongId).toBe("event-song-uuid-1");
    expect(result.eventSongs[0].parts).toEqual(["vocal", "drums"]);
  });

  it("リポジトリに正しい入力を渡す", async () => {
    mockRepo.findSongIdsByEventId.mockResolvedValue([]);
    mockRepo.addEventSongs.mockResolvedValue([mockEventSongRecord]);

    await addEventSongs(mockRepo, "event-uuid-1", {
      songs: [{ songId: "song-uuid-1", parts: ["vocal", "drums"] }],
    });

    expect(mockRepo.addEventSongs).toHaveBeenCalledWith({
      eventId: "event-uuid-1",
      songs: [{ songId: "song-uuid-1", parts: ["vocal", "drums"] }],
    });
  });

  it("duplicate: 既に登録済みの songId が含まれる場合は追加せず duplicate を返す", async () => {
    mockRepo.findSongIdsByEventId.mockResolvedValue(["song-uuid-1"]);

    const result = await addEventSongs(mockRepo, "event-uuid-1", {
      songs: [{ songId: "song-uuid-1", parts: ["vocal"] }],
    });

    expect(result.status).toBe("duplicate");
    if (result.status !== "duplicate") return;
    expect(result.duplicateSongIds).toEqual(["song-uuid-1"]);
    expect(mockRepo.addEventSongs).not.toHaveBeenCalled();
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
