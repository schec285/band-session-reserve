import type { Mock } from "vitest";
import { POST } from "@/app/api/admin/events/[eventId]/songs/route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/admin/songs", () => ({
  addEventSong: vi.fn(),
}));

import { auth } from "@/auth";
import { addEventSong } from "@/server/services/admin/songs";
import { makeCsrfPair } from "@/tests/helpers/csrf";

const mockEventSong = {
  eventSongId: "event-song-uuid-1",
  songId: "song-uuid-1",
  title: "千本桜",
  artist: "黒うさP",
  parts: ["vocal", "drums"],
};

const params = Promise.resolve({ eventId: "event-uuid-1" });

function makeRequest(body: unknown) {
  const { cookieHeader, headers } = makeCsrfPair();
  return new Request("http://localhost/api/admin/events/event-uuid-1/songs", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader, ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue({ user: { id: "user-uuid", role: "admin" } });
  (addEventSong as Mock).mockResolvedValue({ status: "ok", eventSong: mockEventSong });
});

describe("POST /api/admin/events/[eventId]/songs", () => {
  const validBody = { songId: "song-uuid-1", parts: ["vocal", "drums"] };

  describe("正常系", () => {
    it("201: イベントへ曲追加成功", async () => {
      const res = await POST(makeRequest(validBody), { params });
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.eventSong.eventSongId).toBe("event-song-uuid-1");
      expect(json.eventSong.parts).toEqual(["vocal", "drums"]);
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (auth as Mock).mockResolvedValue(null);

      const res = await POST(makeRequest(validBody), { params });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });

    it("403: admin 以外のロール", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: "user-uuid", role: "member" } });

      const res = await POST(makeRequest(validBody), { params });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.message).toBe("権限がありません");
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: songId が空", async () => {
      const res = await POST(makeRequest({ ...validBody, songId: "" }), { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "songId", message: "曲は必須です" });
    });

    it("400: parts が空配列", async () => {
      const res = await POST(makeRequest({ ...validBody, parts: [] }), { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({
        field: "parts",
        message: "パートを1つ以上選択してください",
      });
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
