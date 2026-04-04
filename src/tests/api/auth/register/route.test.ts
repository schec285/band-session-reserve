import { POST } from "@/app/api/auth/register/route";

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
  sendVerificationEmail: jest.fn(),
}));

jest.mock("@/server/services/auth/user", () => ({
  findUserByUsername: jest.fn(),
  findUserByEmail: jest.fn(),
  createUser: jest.fn(),
}));

import { validateCsrfToken } from "@/server/services/csrf/csrf";
import { generateChallenge } from "@/server/services/auth/challenge";
import { sendVerificationEmail } from "@/server/services/auth/email";
import { saveCode } from "@/server/services/auth/verification";
import { findUserByUsername, findUserByEmail, createUser } from "@/server/services/auth/user";

const validBody = {
  username: "山田太郎",
  email: "yamada@example.com",
  password: "p@ssw0rd",
};

function makeRequest(body: unknown, csrfToken = "valid-csrf-token") {
  return new Request("http://localhost/api/auth/register", {
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
  (findUserByUsername as jest.Mock).mockResolvedValue(null);
  (findUserByEmail as jest.Mock).mockResolvedValue(null);
  (createUser as jest.Mock).mockResolvedValue(undefined);
  (sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);
});

describe("POST /api/auth/register", () => {
  describe("正常系", () => {
    it("201: 登録成功・challenge クッキーを発行する", async () => {
      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);

      const setCookie = res.headers.get("Set-Cookie");
      expect(setCookie).toContain("challenge=");
      expect(setCookie).toContain("mock-challenge");
      expect(setCookie).toContain("Path=/api/auth/verify-email");
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: username が空", async () => {
      const res = await POST(makeRequest({ ...validBody, username: "" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("ユーザー名は必須です");
    });

    it("400: email が不正な形式", async () => {
      const res = await POST(makeRequest({ ...validBody, email: "invalid" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("メールアドレスの形式が不正です");
    });

    it("400: email が空", async () => {
      const res = await POST(makeRequest({ ...validBody, email: "" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("メールアドレスは必須です");
    });

    it("400: password が空", async () => {
      const res = await POST(makeRequest({ ...validBody, password: "" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("パスワードは必須です");
    });

    it("400: password がポリシー違反", async () => {
      const res = await POST(makeRequest({ ...validBody, password: "short" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe(
        "パスワードは12文字以上で、大文字・数字・記号を各1文字以上含めてください"
      );
    });

  });

  describe("異常系 — コンフリクト", () => {
    it("409: ユーザー名が既に登録済み", async () => {
      (findUserByUsername as jest.Mock).mockResolvedValue({ id: "existing-user-id" });

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.message).toBe("このユーザー名は既に使用されています");
    });

    it("409: メールアドレスが既に登録済み", async () => {
      (findUserByEmail as jest.Mock).mockResolvedValue({ id: "existing-user-id" });

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.message).toBe("このメールアドレスは既に使用されています");
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
