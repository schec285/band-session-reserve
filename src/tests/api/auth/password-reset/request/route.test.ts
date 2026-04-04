import { POST } from "@/app/api/auth/password-reset/request/route";

jest.mock("@/server/services/csrf/csrf", () => ({
  validateCsrfToken: jest.fn(),
}));

jest.mock("@/server/services/auth/challenge", () => ({
  generateChallenge: jest.fn(),
}));

jest.mock("@/server/services/auth/verification", () => ({
  saveCode: jest.fn(),
}));

jest.mock("@/server/services/auth/email", () => ({
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock("@/server/services/auth/user", () => ({
  findUserByEmail: jest.fn(),
}));

import { validateCsrfToken } from "@/server/services/csrf/csrf";
import { generateChallenge } from "@/server/services/auth/challenge";
import { saveCode } from "@/server/services/auth/verification";
import { sendPasswordResetEmail } from "@/server/services/auth/email";
import { findUserByEmail } from "@/server/services/auth/user";

const validBody = { email: "yamada@example.com" };

function makeRequest(body: unknown, csrfToken = "valid-csrf-token") {
  return new Request("http://localhost/api/auth/password-reset/request", {
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
  (generateChallenge as jest.Mock).mockResolvedValue("mock-challenge");
  (saveCode as jest.Mock).mockResolvedValue(undefined);
  (findUserByEmail as jest.Mock).mockResolvedValue({ id: "user-id" });
  (sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined);
});

describe("POST /api/auth/password-reset/request", () => {
  describe("正常系", () => {
    it("200: リセットコード送信・challenge クッキーを発行する", async () => {
      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const setCookie = res.headers.get("Set-Cookie");
      expect(setCookie).toContain("challenge=");
      expect(setCookie).toContain("mock-challenge");
      expect(setCookie).toContain("Path=/api/auth/password-reset");
    });

    it("200: 存在しないメールアドレスでも同じレスポンスを返す（列挙攻撃対策）", async () => {
      (findUserByEmail as jest.Mock).mockResolvedValue(null);

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const setCookie = res.headers.get("Set-Cookie");
      expect(setCookie).toContain("challenge=");
      expect(setCookie).toContain("mock-challenge");
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: email が空", async () => {
      const res = await POST(makeRequest({ email: "" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("メールアドレスは必須です");
    });

    it("400: email が不正な形式", async () => {
      const res = await POST(makeRequest({ email: "invalid" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("メールアドレスの形式が不正です");
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
