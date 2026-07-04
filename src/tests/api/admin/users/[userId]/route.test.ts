import type { Mock } from "vitest";
import { PATCH } from "@/app/api/admin/users/[userId]/route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/admin/users", () => ({
  updateUserRole: vi.fn(),
}));

import { auth } from "@/auth";
import { updateUserRole } from "@/server/services/admin/users";
import { makeCsrfPair } from "@/tests/helpers/csrf";

const params = Promise.resolve({ userId: "user-uuid-1" });

const mockUser = {
  id: "user-uuid-1",
  name: "山田 太郎",
  email: "yamada@example.com",
  role: "admin",
  isVerified: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  lastLoginAt: "2026-03-01T12:00:00.000Z",
};

function makeRequest(body?: unknown) {
  const { cookieHeader, headers } = makeCsrfPair();
  return new Request("http://localhost/api/admin/users/user-uuid-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader, ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue({ user: { id: "admin-uuid", role: "admin" } });
  (updateUserRole as Mock).mockResolvedValue({ status: "ok", user: mockUser });
});

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

describe("PATCH /api/admin/users/[userId]", () => {
  describe("正常系", () => {
    it("200: 更新後のユーザーを返す", async () => {
      const res = await PATCH(makeRequest({ role: "admin" }), { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.user).toEqual(mockUser);
      expect(updateUserRole).toHaveBeenCalledWith(expect.anything(), "admin-uuid", "user-uuid-1", "admin");
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (auth as Mock).mockResolvedValue(null);

      const res = await PATCH(makeRequest({ role: "admin" }), { params });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });

    it("403: admin 以外のロール", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: "user-uuid", role: "member" } });

      const res = await PATCH(makeRequest({ role: "admin" }), { params });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.message).toBe("権限がありません");
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: role が不正な値", async () => {
      const res = await PATCH(makeRequest({ role: "superadmin" }), { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual(
        expect.objectContaining({ field: "role" })
      );
    });

    it("400: role がない", async () => {
      const res = await PATCH(makeRequest({}), { params });

      expect(res.status).toBe(400);
    });
  });

  describe("異常系 — サービスエラー", () => {
    it("404: 対象ユーザーが存在しない", async () => {
      (updateUserRole as Mock).mockResolvedValue({ status: "not-found" });

      const res = await PATCH(makeRequest({ role: "admin" }), { params });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.message).toBe("ユーザーが見つかりません");
    });

    it("400: 自分自身のロールは変更できない", async () => {
      (updateUserRole as Mock).mockResolvedValue({ status: "self-role-change-forbidden" });

      const res = await PATCH(makeRequest({ role: "member" }), { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("自分自身のロールは変更できません");
    });
  });

  describe("異常系 — CSRF", () => {
    it("403: CSRFトークンが不正な場合", async () => {
      const res = await PATCH(
        new Request("http://localhost/api/admin/users/user-uuid-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "admin" }),
        }),
        { params }
      );

      expect(res.status).toBe(403);
      expect(res.headers.get("X-CSRF-Error")).toBe("1");
    });
  });
});
