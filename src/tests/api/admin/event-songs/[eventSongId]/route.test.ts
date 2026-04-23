import type { Mock } from "vitest";
import { DELETE, PATCH } from "@/app/api/admin/event-songs/[eventSongId]/route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/admin/songs", () => ({
  deleteEventSong: vi.fn(),
  updateEventSongParts: vi.fn(),
}));

import { auth } from "@/auth";
import { deleteEventSong, updateEventSongParts } from "@/server/services/admin/songs";

const params = Promise.resolve({ eventSongId: "event-song-uuid-1" });

function makeDeleteRequest() {
  return new Request("http://localhost/api/admin/event-songs/event-song-uuid-1", {
    method: "DELETE",
  });
}

function makePatchRequest(body?: unknown) {
  return new Request("http://localhost/api/admin/event-songs/event-song-uuid-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue({ user: { id: "user-uuid", role: "admin" } });
  (deleteEventSong as Mock).mockResolvedValue({ status: "ok" });
  (updateEventSongParts as Mock).mockResolvedValue({
    status: "ok",
    eventSongId: "event-song-uuid-1",
    parts: ["vocal", "bass"],
  });
});

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

describe("DELETE /api/admin/event-songs/[eventSongId]", () => {
  describe("正常系", () => {
    it("200: イベント曲削除成功", async () => {
      const res = await DELETE(makeDeleteRequest(), { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("曲をイベントから削除しました");
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (auth as Mock).mockResolvedValue(null);

      const res = await DELETE(makeDeleteRequest(), { params });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });

    it("403: admin 以外のロール", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: "user-uuid", role: "member" } });

      const res = await DELETE(makeDeleteRequest(), { params });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.message).toBe("権限がありません");
    });
  });

  describe("異常系 — サービスエラー", () => {
    it("404: イベント曲が存在しない", async () => {
      (deleteEventSong as Mock).mockResolvedValue({ status: "not-found" });

      const res = await DELETE(makeDeleteRequest(), { params });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.message).toBe("イベント曲が見つかりません");
    });
  });
});

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

describe("PATCH /api/admin/event-songs/[eventSongId]", () => {
  const validBody = { parts: ["vocal", "bass"] };

  describe("正常系", () => {
    it("200: 募集パート更新成功", async () => {
      const res = await PATCH(makePatchRequest(validBody), { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.eventSongId).toBe("event-song-uuid-1");
      expect(json.parts).toEqual(["vocal", "bass"]);
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (auth as Mock).mockResolvedValue(null);

      const res = await PATCH(makePatchRequest(validBody), { params });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });

    it("403: admin 以外のロール", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: "user-uuid", role: "member" } });

      const res = await PATCH(makePatchRequest(validBody), { params });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.message).toBe("権限がありません");
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: parts が空配列", async () => {
      const res = await PATCH(makePatchRequest({ parts: [] }), { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({
        field: "parts",
        message: "パートを1つ以上選択してください",
      });
    });

    it("400: parts がない", async () => {
      const res = await PATCH(makePatchRequest({}), { params });
      const json = await res.json();

      expect(res.status).toBe(400);
    });
  });

  describe("異常系 — サービスエラー", () => {
    it("404: イベント曲が存在しない", async () => {
      (updateEventSongParts as Mock).mockResolvedValue({ status: "not-found" });

      const res = await PATCH(makePatchRequest(validBody), { params });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.message).toBe("イベント曲が見つかりません");
    });
  });
});
