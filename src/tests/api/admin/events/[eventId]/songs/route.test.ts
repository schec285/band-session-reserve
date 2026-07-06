import type { Mock } from "vitest";
import { POST, DELETE } from "@/app/api/admin/events/[eventId]/songs/route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/admin/songs", () => ({
  addEventSongs: vi.fn(),
  deleteEventSongs: vi.fn(),
}));

import { auth } from "@/auth";
import { addEventSongs, deleteEventSongs } from "@/server/services/admin/songs";
import { makeCsrfPair } from "@/tests/helpers/csrf";

const mockEventSong = {
  eventSongId: "event-song-uuid-1",
  songId: "song-uuid-1",
  title: "千本桜",
  artist: "黒うさP",
  parts: ["vocal", "drums"],
};

const params = Promise.resolve({ eventId: "event-uuid-1" });

function makeRequest(method: string, body?: unknown) {
  const { cookieHeader, headers } = makeCsrfPair();
  return new Request("http://localhost/api/admin/events/event-uuid-1/songs", {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookieHeader, ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue({ user: { id: "user-uuid", role: "admin" } });
  (addEventSongs as Mock).mockResolvedValue({ status: "ok", eventSongs: [mockEventSong] });
  (deleteEventSongs as Mock).mockResolvedValue({
    status: "ok",
    deletedEventSongIds: ["event-song-uuid-1"],
  });
});

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

describe("POST /api/admin/events/[eventId]/songs", () => {
  const validBody = { songs: [{ songId: "song-uuid-1", parts: ["vocal", "drums"] }] };

  describe("正常系", () => {
    it("201: イベントへ複数曲の一括追加成功", async () => {
      const res = await POST(makeRequest("POST", validBody), { params });
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.eventSongs).toHaveLength(1);
      expect(json.eventSongs[0].eventSongId).toBe("event-song-uuid-1");
      expect(json.eventSongs[0].parts).toEqual(["vocal", "drums"]);
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (auth as Mock).mockResolvedValue(null);

      const res = await POST(makeRequest("POST", validBody), { params });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });

    it("403: admin 以外のロール", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: "user-uuid", role: "member" } });

      const res = await POST(makeRequest("POST", validBody), { params });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.message).toBe("権限がありません");
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: songs が空配列", async () => {
      const res = await POST(makeRequest("POST", { songs: [] }), { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "songs", message: "曲を1つ以上選択してください" });
    });

    it("400: songs[0].songId が空", async () => {
      const res = await POST(
        makeRequest("POST", { songs: [{ songId: "", parts: ["vocal"] }] }),
        { params }
      );
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "songs.0.songId", message: "曲は必須です" });
    });

    it("400: songs[0].parts が空配列", async () => {
      const res = await POST(
        makeRequest("POST", { songs: [{ songId: "song-uuid-1", parts: [] }] }),
        { params }
      );
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({
        field: "songs.0.parts",
        message: "パートを1つ以上選択してください",
      });
    });

    it("400: songs 内で songId が重複している", async () => {
      const res = await POST(
        makeRequest("POST", {
          songs: [
            { songId: "song-uuid-1", parts: ["vocal"] },
            { songId: "song-uuid-1", parts: ["drums"] },
          ],
        }),
        { params }
      );
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({
        field: "songs",
        message: "同じ曲が重複して指定されています",
      });
    });
  });

  describe("異常系 — サービスエラー", () => {
    it("409: 既に登録済みの曲が含まれる場合", async () => {
      (addEventSongs as Mock).mockResolvedValue({
        status: "duplicate",
        duplicateSongIds: ["song-uuid-1"],
      });

      const res = await POST(makeRequest("POST", validBody), { params });
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.duplicateSongIds).toEqual(["song-uuid-1"]);
    });
  });

  describe("異常系 — CSRF", () => {
    it("403: CSRFトークンが不正な場合", async () => {
      const res = await POST(
        new Request("http://localhost/api/admin/events/event-uuid-1/songs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        }),
        { params }
      );

      expect(res.status).toBe(403);
      expect(res.headers.get("X-CSRF-Error")).toBe("1");
    });
  });
});

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

describe("DELETE /api/admin/events/[eventId]/songs", () => {
  const validBody = { eventSongIds: ["event-song-uuid-1"] };

  describe("正常系", () => {
    it("200: イベント曲の一括削除成功", async () => {
      const res = await DELETE(makeRequest("DELETE", validBody), { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.deletedEventSongIds).toEqual(["event-song-uuid-1"]);
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (auth as Mock).mockResolvedValue(null);

      const res = await DELETE(makeRequest("DELETE", validBody), { params });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });

    it("403: admin 以外のロール", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: "user-uuid", role: "member" } });

      const res = await DELETE(makeRequest("DELETE", validBody), { params });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.message).toBe("権限がありません");
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: eventSongIds が空配列", async () => {
      const res = await DELETE(makeRequest("DELETE", { eventSongIds: [] }), { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({
        field: "eventSongIds",
        message: "削除対象を1件以上選択してください",
      });
    });
  });

  describe("異常系 — CSRF", () => {
    it("403: CSRFトークンが不正な場合", async () => {
      const res = await DELETE(
        new Request("http://localhost/api/admin/events/event-uuid-1/songs", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        }),
        { params }
      );

      expect(res.status).toBe(403);
      expect(res.headers.get("X-CSRF-Error")).toBe("1");
    });
  });
});
