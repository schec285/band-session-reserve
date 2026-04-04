import { POST } from "@/app/api/auth/logout/route";

jest.mock("@/server/services/csrf/csrf", () => ({
  validateCsrfToken: jest.fn(),
}));

jest.mock("@/server/services/auth/session", () => ({
  invalidateSession: jest.fn(),
  getSession: jest.fn(),
}));

import { validateCsrfToken } from "@/server/services/csrf/csrf";
import { invalidateSession, getSession } from "@/server/services/auth/session";

function makeRequest(csrfToken = "valid-csrf-token", sessionCookie = "session=valid-session-token") {
  return new Request("http://localhost/api/auth/logout", {
    method: "POST",
    headers: {
      "Cookie": sessionCookie,
      "X-CSRF-Token": csrfToken,
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (validateCsrfToken as jest.Mock).mockReturnValue(true);
  (getSession as jest.Mock).mockResolvedValue({ userId: "user-id" });
  (invalidateSession as jest.Mock).mockResolvedValue(undefined);
});

describe("POST /api/auth/logout", () => {
  describe("正常系", () => {
    it("200: ログアウト成功・セッションクッキーを削除する", async () => {
      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe("ログアウトしました");

      const setCookie = res.headers.get("Set-Cookie");
      expect(setCookie).toContain("session=;");
      expect(setCookie).toContain("Max-Age=0");
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const res = await POST(makeRequest("valid-csrf-token", ""));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.message).toBe("認証が必要です");
    });
  });

  describe("異常系 — CSRF", () => {
    it("403: CSRFトークンが無効", async () => {
      (validateCsrfToken as jest.Mock).mockReturnValue(false);

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.message).toBe("CSRFトークンが無効です");
    });
  });
});
