import { POST } from "../route";

jest.mock("@/lib/auth/csrf", () => ({
  validateCsrfToken: jest.fn(),
}));

jest.mock("@/lib/auth/challenge", () => ({
  validateChallenge: jest.fn(),
}));

jest.mock("@/lib/auth/verification", () => ({
  validateVerificationCode: jest.fn(),
  activateUser: jest.fn(),
}));

import { validateCsrfToken } from "@/lib/auth/csrf";
import { validateChallenge } from "@/lib/auth/challenge";
import { validateVerificationCode, activateUser } from "@/lib/auth/verification";

const validBody = {
  code: "483920",
  challenge: "valid-challenge",
};

function makeRequest(body: unknown, csrfToken = "valid-csrf-token") {
  return new Request("http://localhost/api/auth/verify-email", {
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
  (validateChallenge as jest.Mock).mockResolvedValue(true);
  (validateVerificationCode as jest.Mock).mockResolvedValue("valid");
  (activateUser as jest.Mock).mockResolvedValue(undefined);
});

describe("POST /api/auth/verify-email", () => {
  describe("正常系", () => {
    it("200: メールアドレス有効化成功", async () => {
      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe("メールアドレス認証が完了しました。ログインしてください");
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: code が空", async () => {
      const res = await POST(makeRequest({ ...validBody, code: "" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("認証コードは必須です");
    });

    it("400: コードが無効", async () => {
      (validateVerificationCode as jest.Mock).mockResolvedValue("invalid");

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("認証コードが正しくありません");
    });

    it("400: コードの有効期限切れ（5分）", async () => {
      (validateVerificationCode as jest.Mock).mockResolvedValue("expired");

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe(
        "認証コードの有効期限が切れています。再度登録してください"
      );
    });

    it("400: チャレンジ検証失敗", async () => {
      (validateChallenge as jest.Mock).mockResolvedValue(false);

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("操作が無効です。最初からやり直してください");
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
