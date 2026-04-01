import { POST } from "../route";

jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
  },
}));

jest.mock("@/lib/auth/csrf", () => ({
  validateCsrfToken: jest.fn(),
}));

jest.mock("@/lib/auth/email", () => ({
  sendVerificationEmail: jest.fn(),
}));

import { validateCsrfToken } from "@/lib/auth/csrf";
import { sendVerificationEmail } from "@/lib/auth/email";
import { db } from "@/lib/db";

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
  (db.select as jest.Mock).mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([]),
    }),
  });
  (db.insert as jest.Mock).mockReturnValue({
    values: jest.fn().mockResolvedValue(undefined),
  });
  (sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);
});

describe("POST /api/auth/register", () => {
  describe("正常系", () => {
    it("201: 登録成功・challenge を返す", async () => {
      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(typeof json.challenge).toBe("string");
      expect(json.challenge.length).toBeGreaterThan(0);
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

    it("400: password が空", async () => {
      const res = await POST(makeRequest({ ...validBody, password: "" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("パスワードは必須です");
    });

    it("400: メールアドレスが既に登録済み", async () => {
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ id: "existing-user-id" }]),
        }),
      });

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(400);
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
