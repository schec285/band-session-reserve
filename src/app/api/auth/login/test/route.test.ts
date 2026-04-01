import { POST } from "../route";

jest.mock("@/lib/auth/csrf", () => ({
  validateCsrfToken: jest.fn(),
  generateCsrfToken: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  createSession: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

import { validateCsrfToken, generateCsrfToken } from "@/lib/auth/csrf";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

const validBody = {
  email: "yamada@example.com",
  password: "p@ssw0rd",
};

const verifiedUser = {
  id: "user-id",
  email: "yamada@example.com",
  passwordHash: "hashed-password",
  role: "member",
  emailVerifiedAt: new Date(),
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
  (generateCsrfToken as jest.Mock).mockReturnValue("new-csrf-token");
  (createSession as jest.Mock).mockResolvedValue("session-token");
  (db.select as jest.Mock).mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([verifiedUser]),
    }),
  });
});

describe("POST /api/auth/login", () => {
  describe("正常系", () => {
    it("200: ログイン成功・Set-Cookie・role・csrfToken を返す", async () => {
      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe("ログインしました");
      expect(json.role === "member" || json.role === "admin").toBe(true);
      expect(typeof json.csrfToken).toBe("string");

      const setCookie = res.headers.get("Set-Cookie");
      expect(setCookie).toContain("session=");
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain("Secure");
      expect(setCookie).toContain("SameSite=Strict");
    });
  });

  describe("異常系 — 認証失敗", () => {
    it("401: メールアドレスが存在しない", async () => {
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.message).toBe(
        "メールアドレスまたはパスワードが正しくありません"
      );
    });

    it("401: パスワードが正しくない", async () => {
      const res = await POST(
        makeRequest({ ...validBody, password: "wrong-password" })
      );
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.message).toBe(
        "メールアドレスまたはパスワードが正しくありません"
      );
    });

    it("403: メールアドレス未認証", async () => {
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            { ...verifiedUser, emailVerifiedAt: null },
          ]),
        }),
      });

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.message).toBe(
        "メールアドレスの確認が完了していません。メールをご確認ください"
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
