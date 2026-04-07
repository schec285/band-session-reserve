import type { Mock } from "vitest";
import { GET, POST } from "@/app/api/admin/songs/route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/admin/songs", () => ({
  getAllSongs: vi.fn(),
  createSong: vi.fn(),
}));

import { auth } from "@/auth";
import { getAllSongs, createSong } from "@/server/services/admin/songs";

const mockSongs = [
  { id: "song-uuid-1", title: "千本桜", artist: "黒うさP" },
  { id: "song-uuid-2", title: "命に嫌われている。", artist: "カンザキイオリ" },
];

function makeRequest(method: string, body?: unknown) {
  return new Request("http://localhost/api/admin/songs", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue({ user: { id: "user-uuid", role: "admin" } });
  (getAllSongs as Mock).mockResolvedValue(mockSongs);
  (createSong as Mock).mockResolvedValue({ status: "ok", song: mockSongs[0] });
});

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

describe("GET /api/admin/songs", () => {
  describe("正常系", () => {
    it("200: 曲一覧を返す", async () => {
      const res = await GET(makeRequest("GET"));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.songs).toEqual(mockSongs);
    });

    it("200: 曲が 0 件の場合は空配列を返す", async () => {
      (getAllSongs as Mock).mockResolvedValue([]);

      const res = await GET(makeRequest("GET"));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.songs).toEqual([]);
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (auth as Mock).mockResolvedValue(null);

      const res = await GET(makeRequest("GET"));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });

    it("403: admin 以外のロール", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: "user-uuid", role: "member" } });

      const res = await GET(makeRequest("GET"));
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.message).toBe("権限がありません");
    });
  });
});

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

describe("POST /api/admin/songs", () => {
  const validBody = { title: "千本桜", artist: "黒うさP" };

  describe("正常系", () => {
    it("201: 曲作成成功", async () => {
      const res = await POST(makeRequest("POST", validBody));
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.song.id).toBe("song-uuid-1");
      expect(json.song.title).toBe("千本桜");
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (auth as Mock).mockResolvedValue(null);

      const res = await POST(makeRequest("POST", validBody));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: title が空", async () => {
      const res = await POST(makeRequest("POST", { ...validBody, title: "" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "title", message: "曲名は必須です" });
    });

    it("400: artist が空", async () => {
      const res = await POST(makeRequest("POST", { ...validBody, artist: "" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "artist", message: "アーティスト名は必須です" });
    });
  });
});
