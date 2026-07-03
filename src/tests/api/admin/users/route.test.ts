import type { Mock } from "vitest";
import { GET } from "@/app/api/admin/users/route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/admin/users", () => ({
  getAllUsers: vi.fn(),
}));

import { auth } from "@/auth";
import { getAllUsers } from "@/server/services/admin/users";

const mockUsers = [
  { id: "user-uuid-1", name: "山田 太郎", email: "yamada@example.com", role: "admin", isVerified: true, createdAt: "2026-01-01T00:00:00.000Z", lastLoginAt: "2026-03-01T12:00:00.000Z" },
  { id: "user-uuid-2", name: "鈴木 花子", email: "suzuki@example.com", role: "member", isVerified: false, createdAt: "2026-02-01T00:00:00.000Z", lastLoginAt: null },
];

function makeRequest() {
  return new Request("http://localhost/api/admin/users", { method: "GET" });
}

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue({ user: { id: "admin-uuid", role: "admin" } });
  (getAllUsers as Mock).mockResolvedValue(mockUsers);
});

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

describe("GET /api/admin/users", () => {
  describe("正常系", () => {
    it("200: ユーザー一覧を返す", async () => {
      const res = await GET(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.users).toEqual(mockUsers);
    });

    it("200: ユーザーが0件の場合は空配列を返す", async () => {
      (getAllUsers as Mock).mockResolvedValue([]);

      const res = await GET(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.users).toEqual([]);
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (auth as Mock).mockResolvedValue(null);

      const res = await GET(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });

    it("403: admin 以外のロール", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: "user-uuid", role: "member" } });

      const res = await GET(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.message).toBe("権限がありません");
    });
  });
});
