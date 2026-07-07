import type { Mock } from "vitest";
import { PATCH, DELETE } from "@/app/api/admin/songs/[songId]/route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/admin/songs", () => ({
  updateSong: vi.fn(),
  deleteSong: vi.fn(),
}));

import { auth } from "@/auth";
import { updateSong, deleteSong } from "@/server/services/admin/songs";
import { makeCsrfPair } from "@/tests/helpers/csrf";

const params = Promise.resolve({ songId: "song-uuid-1" });

const mockSong = {
  id: "song-uuid-1",
  title: "新しい曲名",
  artist: "黒うさP",
  createdAt: "2026-01-15T12:00:00+09:00",
  inUse: false,
};

function makeDeleteRequest() {
  const { cookieHeader, headers } = makeCsrfPair();
  return new Request("http://localhost/api/admin/songs/song-uuid-1", {
    method: "DELETE",
    headers: { Cookie: cookieHeader, ...headers },
  });
}

function makePatchRequest(body?: unknown) {
  const { cookieHeader, headers } = makeCsrfPair();
  return new Request("http://localhost/api/admin/songs/song-uuid-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader, ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue({ user: { id: "user-uuid", role: "admin" } });
  (updateSong as Mock).mockResolvedValue({ status: "ok", song: mockSong });
  (deleteSong as Mock).mockResolvedValue({ status: "ok" });
});

describe("PATCH /api/admin/songs/[songId]", () => {
  const validBody = { title: "新しい曲名" };

  describe("正常系", () => {
    it("200: 曲名更新成功", async () => {
      const res = await PATCH(makePatchRequest(validBody), { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.song.title).toBe("新しい曲名");
      expect(updateSong).toHaveBeenCalledWith(expect.anything(), "song-uuid-1", { title: "新しい曲名" });
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
    it("400: title が空", async () => {
      const res = await PATCH(makePatchRequest({ title: "" }), { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "title", message: "曲名は必須です" });
    });
  });

  describe("異常系 — 存在しない", () => {
    it("404: 曲が存在しない場合", async () => {
      (updateSong as Mock).mockResolvedValue({ status: "not-found" });

      const res = await PATCH(makePatchRequest(validBody), { params });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.message).toBe("曲が見つかりません");
    });
  });

  describe("異常系 — CSRF", () => {
    it("403: CSRFトークンが不正な場合", async () => {
      const res = await PATCH(
        new Request("http://localhost/api/admin/songs/song-uuid-1", {
          method: "PATCH",
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

describe("DELETE /api/admin/songs/[songId]", () => {
  describe("正常系", () => {
    it("200: 削除成功", async () => {
      const res = await DELETE(makeDeleteRequest(), { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("曲を削除しました");
      expect(deleteSong).toHaveBeenCalledWith(expect.anything(), "song-uuid-1");
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

  describe("異常系 — 存在しない", () => {
    it("404: 曲が存在しない場合", async () => {
      (deleteSong as Mock).mockResolvedValue({ status: "not-found" });

      const res = await DELETE(makeDeleteRequest(), { params });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.message).toBe("曲が見つかりません");
    });
  });

  describe("異常系 — CSRF", () => {
    it("403: CSRFトークンが不正な場合", async () => {
      const res = await DELETE(
        new Request("http://localhost/api/admin/songs/song-uuid-1", { method: "DELETE" }),
        { params }
      );

      expect(res.status).toBe(403);
      expect(res.headers.get("X-CSRF-Error")).toBe("1");
    });
  });
});
