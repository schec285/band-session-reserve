import type { Mock } from "vitest";
import { POST } from "@/app/api/auth/verify-email/route";

vi.mock("@/server/repositories/auth/user-repository.drizzle", () => ({
  DrizzleUserRepository: class {},
}));

vi.mock("@/server/repositories/auth/verification-token-repository.drizzle", () => ({
  DrizzleVerificationTokenRepository: class {},
}));

vi.mock("resend", () => ({
  Resend: class {},
}));

vi.mock("@/server/services/email/auth/email-service.resend", () => ({
  ResendEmailService: class {},
}));

vi.mock("@/server/services/auth/verify-email", () => ({
  verifyEmail: vi.fn(),
}));

import { verifyEmail } from "@/server/services/auth/verify-email";
import { createVerifyCookieValue } from "@/lib/auth/hmac";
import { makeCsrfPair } from "@/tests/helpers/csrf";
import crypto from "crypto";

const EMAIL = "test@example.com";
const EMAIL_HASH = crypto.createHash("sha256").update(EMAIL).digest("hex");
const TOKEN_ID = "token-id-1";

function makeValidCookie() {
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const value = createVerifyCookieValue(EMAIL_HASH, TOKEN_ID, expiresAt);
  return `signup_verify_token=${value}`;
}

function makeRequest(body: unknown, cookie?: string) {
  const { cookieHeader, headers: csrfHeaders } = makeCsrfPair();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Cookie: cookie ? `${cookie}; ${cookieHeader}` : cookieHeader,
    ...csrfHeaders,
  };
  return new Request("http://localhost/api/auth/verify-email", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/verify-email", () => {
  describe("正常系", () => {
    it("200: 認証成功・クッキー削除", async () => {
      (verifyEmail as Mock).mockResolvedValue({ status: "ok" });

      const res = await POST(makeRequest({ code: "123456" }, makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("メールアドレスの認証が完了しました");
      expect(res.headers.get("set-cookie")).toMatch(/signup_verify_token=;/);
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: code が未指定", async () => {
      const res = await POST(makeRequest({}, makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "code", message: "認証コードを入力してください" });
    });

    it("401: クッキーがない場合", async () => {
      const res = await POST(makeRequest({ code: "123456" }));

      expect(res.status).toBe(401);
    });

    it("401: HMAC が不正な場合", async () => {
      const res = await POST(makeRequest({ code: "123456" }, "signup_verify_token=invalid.data.here.badsig"));

      expect(res.status).toBe(401);
    });
  });

  describe("異常系 — 認証エラー", () => {
    it("400: コード不一致", async () => {
      (verifyEmail as Mock).mockResolvedValue({ status: "error", reason: "invalid" });

      const res = await POST(makeRequest({ code: "000000" }, makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("認証コードが正しくありません");
    });

    it("400: 期限切れ・クッキー削除", async () => {
      (verifyEmail as Mock).mockResolvedValue({ status: "error", reason: "expired" });

      const res = await POST(makeRequest({ code: "123456" }, makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("認証コードの有効期限が切れています");
      expect(res.headers.get("set-cookie")).toMatch(/signup_verify_token=;/);
    });

    it("400: 試行回数超過でリスタート・クッキー削除", async () => {
      (verifyEmail as Mock).mockResolvedValue({ status: "error", reason: "restart" });

      const res = await POST(makeRequest({ code: "000000" }, makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("最初からやり直してください");
      expect(res.headers.get("set-cookie")).toMatch(/signup_verify_token=;/);
    });
  });

  describe("異常系 — CSRF", () => {
    it("403: CSRFトークンが不正な場合", async () => {
      const res = await POST(
        new Request("http://localhost/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: makeValidCookie() },
          body: JSON.stringify({ code: "123456" }),
        })
      );

      expect(res.status).toBe(403);
      expect(res.headers.get("X-CSRF-Error")).toBe("1");
    });
  });
});
