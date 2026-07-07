import type { Mock } from "vitest";
import { DELETE } from "@/app/api/admin/event-songs/[eventSongId]/reservations/[part]/route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/admin/songs", () => ({
  removeReservation: vi.fn(),
}));

import { auth } from "@/auth";
import { removeReservation } from "@/server/services/admin/songs";
import { makeCsrfPair } from "@/tests/helpers/csrf";

const params = Promise.resolve({ eventSongId: "event-song-uuid-1", part: "vocal" });

function makeDeleteRequest() {
  const { cookieHeader, headers } = makeCsrfPair();
  return new Request("http://localhost/api/admin/event-songs/event-song-uuid-1/reservations/vocal", {
    method: "DELETE",
    headers: { Cookie: cookieHeader, ...headers },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue({ user: { id: "user-uuid", role: "admin" } });
  (removeReservation as Mock).mockResolvedValue({ status: "ok" });
});

describe("DELETE /api/admin/event-songs/[eventSongId]/reservations/[part]", () => {
  describe("正常系", () => {
    it("200: エントリー削除成功", async () => {
      const res = await DELETE(makeDeleteRequest(), { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("エントリーを削除しました");
      expect(removeReservation).toHaveBeenCalledWith(expect.anything(), "event-song-uuid-1", "vocal");
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

  describe("異常系 — バリデーション", () => {
    it("400: part が不正な値", async () => {
      const { cookieHeader, headers } = makeCsrfPair();
      const res = await DELETE(
        new Request("http://localhost/api/admin/event-songs/event-song-uuid-1/reservations/invalid-part", {
          method: "DELETE",
          headers: { Cookie: cookieHeader, ...headers },
        }),
        { params: Promise.resolve({ eventSongId: "event-song-uuid-1", part: "invalid-part" }) }
      );

      expect(res.status).toBe(400);
    });
  });

  describe("異常系 — サービスエラー", () => {
    it("404: エントリーが存在しない", async () => {
      (removeReservation as Mock).mockResolvedValue({ status: "not-found" });

      const res = await DELETE(makeDeleteRequest(), { params });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.message).toBe("エントリーが見つかりません");
    });
  });

  describe("異常系 — CSRF", () => {
    it("403: CSRFトークンが不正な場合", async () => {
      const res = await DELETE(
        new Request("http://localhost/api/admin/event-songs/event-song-uuid-1/reservations/vocal", {
          method: "DELETE",
        }),
        { params }
      );

      expect(res.status).toBe(403);
      expect(res.headers.get("X-CSRF-Error")).toBe("1");
    });
  });
});
