import type { Mock } from "vitest";
import { PATCH } from "@/app/api/admin/events/[eventId]/collections/route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/admin/events", () => ({
  setCollection: vi.fn(),
}));

import { auth } from "@/auth";
import { setCollection } from "@/server/services/admin/events";
import { makeCsrfPair } from "@/tests/helpers/csrf";

const params = Promise.resolve({ eventId: "event-uuid-1" });

function makeRequest(body?: unknown) {
  const { cookieHeader, headers } = makeCsrfPair();
  return new Request("http://localhost/api/admin/events/event-uuid-1/collections", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader, ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue({ user: { id: "admin-uuid", role: "admin" } });
  (setCollection as Mock).mockResolvedValue({ status: "ok" });
});

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

describe("PATCH /api/admin/events/[eventId]/collections", () => {
  describe("正常系", () => {
    it("200: 徴収済みに更新成功", async () => {
      const res = await PATCH(makeRequest({ userId: "11111111-1111-1111-8111-111111111111", collected: true }), { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("更新しました");
    });

    it("200: 未徴収に更新成功", async () => {
      const res = await PATCH(makeRequest({ userId: "11111111-1111-1111-8111-111111111111", collected: false }), { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("更新しました");
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (auth as Mock).mockResolvedValue(null);

      const res = await PATCH(makeRequest({ userId: "11111111-1111-1111-8111-111111111111", collected: true }), { params });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });

    it("403: admin 以外のロール", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: "user-uuid", role: "member" } });

      const res = await PATCH(makeRequest({ userId: "11111111-1111-1111-8111-111111111111", collected: true }), { params });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.message).toBe("権限がありません");
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: userId が UUID 形式でない", async () => {
      const res = await PATCH(makeRequest({ userId: "invalid-id", collected: true }), { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual(
        expect.objectContaining({ field: "userId" })
      );
    });

    it("400: collected が boolean でない", async () => {
      const res = await PATCH(makeRequest({ userId: "11111111-1111-1111-8111-111111111111", collected: "yes" }), { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual(
        expect.objectContaining({ field: "collected" })
      );
    });
  });

  describe("異常系 — サービスエラー", () => {
    it("404: イベントが存在しない", async () => {
      (setCollection as Mock).mockResolvedValue({ status: "not-found" });

      const res = await PATCH(makeRequest({ userId: "11111111-1111-1111-8111-111111111111", collected: true }), { params });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.message).toBe("イベントが見つかりません");
    });
  });

  describe("異常系 — CSRF", () => {
    it("403: CSRFトークンが不正な場合", async () => {
      const res = await PATCH(
        new Request("http://localhost/api/admin/events/event-uuid-1/collections", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "11111111-1111-1111-8111-111111111111", collected: true }),
        }),
        { params }
      );

      expect(res.status).toBe(403);
      expect(res.headers.get("X-CSRF-Error")).toBe("1");
    });
  });
});
