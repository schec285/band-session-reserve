import { POST } from "@/app/api/auth/password-reset/route";

jest.mock("@/server/services/auth/csrf", () => ({
  validateCsrfToken: jest.fn(),
}));

jest.mock("@/server/services/auth/challenge", () => ({
  validateChallenge: jest.fn(),
}));

jest.mock("@/server/services/auth/verification", () => ({
  validatePasswordResetCode: jest.fn(),
  updatePassword: jest.fn(),
}));

import { validateCsrfToken } from "@/server/services/auth/csrf";
import { validateChallenge } from "@/server/services/auth/challenge";
import { validatePasswordResetCode, updatePassword } from "@/server/services/auth/verification";

const validBody = {
  code: "847201",
  challenge: "valid-challenge",
  password: "newP@ssw0rd",
};

function makeRequest(body: unknown, csrfToken = "valid-csrf-token") {
  return new Request("http://localhost/api/auth/password-reset", {
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
  (validatePasswordResetCode as jest.Mock).mockResolvedValue("valid");
  (updatePassword as jest.Mock).mockResolvedValue(undefined);
});

describe("POST /api/auth/password-reset", () => {
  describe("正常系", () => {
    it("200: パスワードリセット成功", async () => {
      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe(
        "パスワードを再設定しました。新しいパスワードでログインしてください"
      );
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

    it("400: code が6桁の数字でない", async () => {
      const res = await POST(makeRequest({ ...validBody, code: "abc" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("認証コードは6桁の数字で入力してください");
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

  describe("異常系 — 認証失敗", () => {
    it("401: コードが無効", async () => {
      (validatePasswordResetCode as jest.Mock).mockResolvedValue("invalid");

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.message).toBe("認証コードが正しくありません");
    });

    it("401: チャレンジ検証失敗", async () => {
      (validateChallenge as jest.Mock).mockResolvedValue(false);

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.message).toBe("操作が無効です。最初からやり直してください");
    });
  });

  describe("異常系 — 期限切れ", () => {
    it("408: コードの有効期限切れ（5分）", async () => {
      (validatePasswordResetCode as jest.Mock).mockResolvedValue("expired");

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(408);
      expect(json.success).toBe(false);
      expect(json.message).toBe(
        "認証コードの有効期限が切れています。再度パスワードリセットを申請してください"
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
