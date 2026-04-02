import { POST } from "../route";

jest.mock("@/lib/auth/csrf", () => ({
  validateCsrfToken: jest.fn(),
}));

jest.mock("@/lib/auth/challenge", () => ({
  generateChallenge: jest.fn(),
}));

jest.mock("@/lib/auth/email", () => ({
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

import { validateCsrfToken } from "@/lib/auth/csrf";
import { generateChallenge } from "@/lib/auth/challenge";
import { sendPasswordResetEmail } from "@/lib/auth/email";
import { db } from "@/lib/db";

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
  (db.select as jest.Mock).mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([{ id: "user-id" }]),
    }),
  });
  (sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined);
});

describe("POST /api/auth/password-reset/request", () => {
  describe("正常系", () => {
    it("200: リセットコード送信・challenge を返す", async () => {
      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.challenge).toBe("mock-challenge");
    });

    it("200: 存在しないメールアドレスでも同じレスポンスを返す（列挙攻撃対策）", async () => {
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.challenge).toBe("mock-challenge");
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
