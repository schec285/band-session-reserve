import type { Mock } from "vitest";
import { POST } from "@/app/api/auth/reset-password/route";

vi.mock("@/server/repositories/auth/user-repository.drizzle", () => ({
  DrizzleUserRepository: class {},
}));

vi.mock("@/server/repositories/auth/verification-token-repository.drizzle", () => ({
  DrizzleVerificationTokenRepository: class {},
}));

vi.mock("@/server/services/auth/reset-password", () => ({
  resetPassword: vi.fn(),
}));

import { resetPassword } from "@/server/services/auth/reset-password";
import { createVerifyCookieValue } from "@/lib/auth/hmac";
import crypto from "crypto";

const EMAIL = "test@example.com";
const EMAIL_HASH = crypto.createHash("sha256").update(EMAIL).digest("hex");
const TOKEN_ID = "token-id-1";

function makeValidCookie() {
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const value = createVerifyCookieValue(EMAIL_HASH, TOKEN_ID, expiresAt);
  return `reset_token=${value}`;
}

function makeRequest(body: unknown, cookie?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = cookie;
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/reset-password", () => {
  describe("正常系", () => {
    it("200: パスワード更新成功・reset_token クッキー削除・flash クッキー発行", async () => {
      (resetPassword as Mock).mockResolvedValue({ status: "ok" });

      const res = await POST(makeRequest({ password: "newpassword123", confirmPassword: "newpassword123" }, makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBeTruthy();
      const setCookie = res.headers.get("set-cookie") ?? "";
      expect(setCookie).toMatch(/reset_token=;/);
      expect(setCookie).toMatch(/flash=/);
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: password が未指定", async () => {
      const res = await POST(makeRequest({ confirmPassword: "newpassword123" }, makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual(expect.objectContaining({ field: "password" }));
    });

    it("400: パスワードが8文字未満", async () => {
      const res = await POST(makeRequest({ password: "short", confirmPassword: "short" }, makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual(expect.objectContaining({ field: "password" }));
    });

    it("400: パスワードが不一致", async () => {
      const res = await POST(makeRequest({ password: "newpassword123", confirmPassword: "different123" }, makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual(expect.objectContaining({ field: "confirmPassword" }));
    });

    it("401: クッキーがない", async () => {
      const res = await POST(makeRequest({ password: "newpassword123", confirmPassword: "newpassword123" }));
      expect(res.status).toBe(401);
    });

    it("401: HMAC が不正", async () => {
      const res = await POST(makeRequest({ password: "newpassword123", confirmPassword: "newpassword123" }, "reset_token=invalid.data.here.badsig"));
      expect(res.status).toBe(401);
    });
  });

  describe("異常系 — サービスエラー", () => {
    it("400: invalid → reset_token 削除", async () => {
      (resetPassword as Mock).mockResolvedValue({ status: "error", reason: "invalid" });

      const res = await POST(makeRequest({ password: "newpassword123", confirmPassword: "newpassword123" }, makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(res.headers.get("set-cookie")).toMatch(/reset_token=;/);
    });

    it("400: expired → reset_token 削除", async () => {
      (resetPassword as Mock).mockResolvedValue({ status: "error", reason: "expired" });

      const res = await POST(makeRequest({ password: "newpassword123", confirmPassword: "newpassword123" }, makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(res.headers.get("set-cookie")).toMatch(/reset_token=;/);
    });
  });
});
