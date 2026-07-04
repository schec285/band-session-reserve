import type { Mock } from "vitest";
import { PUT } from "@/app/api/user/password/route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {},
}));

vi.mock("@/server/services/email/auth/email-service.resend", () => ({
  ResendEmailService: class {},
}));

vi.mock("@/server/services/user/password", () => ({
  changePassword: vi.fn(),
}));

import { auth } from "@/auth";
import { changePassword } from "@/server/services/user/password";
import { makeCsrfPair } from "@/tests/helpers/csrf";

const validBody = {
  currentPassword: "currentpassword123",
  newPassword: "NewP@ssw0rd1",
  confirmNewPassword: "NewP@ssw0rd1",
};

function makePutRequest(body: unknown) {
  const { cookieHeader, headers } = makeCsrfPair();
  return new Request("http://localhost/api/user/password", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader, ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue({ user: { id: "user-uuid" } });
});

describe("PUT /api/user/password", () => {
  describe("正常系", () => {
    it("200: パスワードを変更する", async () => {
      (changePassword as Mock).mockResolvedValue({ status: "ok" });

      const res = await PUT(makePutRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("パスワードを変更しました");
    });

    it("changePassword に正しい引数が渡る（confirmNewPasswordは渡さない）", async () => {
      (changePassword as Mock).mockResolvedValue({ status: "ok" });

      await PUT(makePutRequest(validBody));

      expect(changePassword).toHaveBeenCalledWith(expect.anything(), expect.anything(), "user-uuid", {
        currentPassword: "currentpassword123",
        newPassword: "NewP@ssw0rd1",
      });
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (auth as Mock).mockResolvedValue(null);

      const res = await PUT(makePutRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: currentPassword が空文字", async () => {
      const res = await PUT(makePutRequest({ ...validBody, currentPassword: "" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("入力内容に誤りがあります");
      expect(json.errors).toContainEqual(expect.objectContaining({ field: "currentPassword" }));
    });

    it("400: currentPassword が未指定", async () => {
      const { currentPassword: _, ...bodyWithoutCurrent } = validBody;
      const res = await PUT(makePutRequest(bodyWithoutCurrent));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("入力内容に誤りがあります");
    });

    it("400: newPassword が12文字未満", async () => {
      const res = await PUT(makePutRequest({ ...validBody, newPassword: "short1", confirmNewPassword: "short1" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual(expect.objectContaining({ field: "newPassword" }));
    });

    it("400: newPassword が128文字を超える", async () => {
      const longPassword = "Aa1!" + "a".repeat(126);
      const res = await PUT(makePutRequest({ ...validBody, newPassword: longPassword, confirmNewPassword: longPassword }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual(expect.objectContaining({ field: "newPassword" }));
    });

    it("400: newPassword に大文字を含まない", async () => {
      const res = await PUT(makePutRequest({ ...validBody, newPassword: "newp@ssw0rd1", confirmNewPassword: "newp@ssw0rd1" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "newPassword", message: "大文字を含めてください" });
    });

    it("400: newPassword に記号を含まない", async () => {
      const res = await PUT(makePutRequest({ ...validBody, newPassword: "NewPassw0rd12", confirmNewPassword: "NewPassw0rd12" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "newPassword", message: "記号を含めてください" });
    });

    it("400: newPassword と confirmNewPassword が不一致", async () => {
      const res = await PUT(makePutRequest({ ...validBody, confirmNewPassword: "differentpassword" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual(expect.objectContaining({ field: "confirmNewPassword" }));
    });

    it("バリデーションエラー時は changePassword が呼ばれない", async () => {
      await PUT(makePutRequest({ ...validBody, newPassword: "short1", confirmNewPassword: "short1" }));

      expect(changePassword).not.toHaveBeenCalled();
    });
  });

  describe("異常系 — サービス結果", () => {
    it("404: user_not_found", async () => {
      (changePassword as Mock).mockResolvedValue({ status: "error", reason: "user_not_found" });

      const res = await PUT(makePutRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.message).toBe("ユーザーが見つかりません");
    });

    it("400: no_password（OAuthのみユーザー）", async () => {
      (changePassword as Mock).mockResolvedValue({ status: "error", reason: "no_password" });

      const res = await PUT(makePutRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("このアカウントはパスワードが設定されていません");
    });

    it("400: invalid_current_password", async () => {
      (changePassword as Mock).mockResolvedValue({ status: "error", reason: "invalid_current_password" });

      const res = await PUT(makePutRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("現在のパスワードが正しくありません");
      expect(json.errors).toContainEqual(
        expect.objectContaining({ field: "currentPassword", message: "現在のパスワードが正しくありません" })
      );
    });

    it("400: password_similar_to_identity", async () => {
      (changePassword as Mock).mockResolvedValue({ status: "error", reason: "password_similar_to_identity" });

      const res = await PUT(makePutRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("パスワードにメールアドレスやお客様の名前を含めることはできません");
      expect(json.errors).toContainEqual(
        expect.objectContaining({ field: "newPassword", message: "パスワードにメールアドレスやお客様の名前を含めることはできません" })
      );
    });
  });

  describe("異常系 — CSRF", () => {
    it("403: CSRFトークンが不正な場合", async () => {
      const res = await PUT(
        new Request("http://localhost/api/user/password", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        })
      );

      expect(res.status).toBe(403);
      expect(res.headers.get("X-CSRF-Error")).toBe("1");
    });
  });
});
