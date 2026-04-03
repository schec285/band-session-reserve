import { POST } from "@/app/api/auth/login/route";

jest.mock("@/server/services/auth/csrf", () => ({
  validateCsrfToken: jest.fn(),
}));

jest.mock("@/server/services/auth/session", () => ({
  createSession: jest.fn(),
}));

jest.mock("@/server/services/auth/user", () => ({
  authenticateUser: jest.fn(),
}));

import { validateCsrfToken } from "@/server/services/auth/csrf";
import { createSession } from "@/server/services/auth/session";
import { authenticateUser } from "@/server/services/auth/user";

const validBody = {
  email: "yamada@example.com",
  password: "p@ssw0rd",
};

function makeRequest(body: unknown, csrfToken = "valid-csrf-token") {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (validateCsrfToken as jest.Mock).mockReturnValue(true);
  (createSession as jest.Mock).mockResolvedValue("session-token");
  (authenticateUser as jest.Mock).mockResolvedValue({
    status: "ok",
    user: { id: "user-id", role: "member" },
  });
});

describe("POST /api/auth/login", () => {
  describe("正常系", () => {
    it("200: ログイン成功・Set-Cookie・role を返す", async () => {
      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe("ログインしました");
      expect(json.role === "member" || json.role === "admin").toBe(true);

      const setCookie = res.headers.get("Set-Cookie");
      expect(setCookie).toContain("session=");
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain("Secure");
      expect(setCookie).toContain("SameSite=Strict");
    });
  });

  describe("異常系 — 認証失敗", () => {
    it("401: メールアドレスが存在しない", async () => {
      (authenticateUser as jest.Mock).mockResolvedValue({ status: "not-found" });

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.message).toBe(
        "メールアドレスまたはパスワードが正しくありません"
      );
    });

    it("401: パスワードが正しくない", async () => {
      (authenticateUser as jest.Mock).mockResolvedValue({ status: "wrong-password" });

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.message).toBe(
        "メールアドレスまたはパスワードが正しくありません"
      );
    });

    it("401: メールアドレス未認証", async () => {
      (authenticateUser as jest.Mock).mockResolvedValue({ status: "unverified" });

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.message).toBe(
        "メールアドレスまたはパスワードが正しくありません"
      );
    });
  });

  describe("異常系 — CSRF", () => {
    it("403: CSRFトークンが無効", async () => {
      (validateCsrfToken as jest.Mock).mockReturnValue(false);

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.message).toBe("CSRFトークンが無効です");
    });
  });
});
