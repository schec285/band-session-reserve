import type { Mock } from "vitest";
import { POST } from "@/app/api/auth/reset-password/verify/route";

vi.mock("@/server/repositories/auth/user-repository.drizzle", () => ({
  DrizzleUserRepository: class {},
}));

vi.mock("@/server/repositories/auth/verification-token-repository.drizzle", () => ({
  DrizzleVerificationTokenRepository: class {},
}));

vi.mock("@/server/services/auth/verify-reset-code", () => ({
  verifyResetCode: vi.fn(),
}));

import { verifyResetCode } from "@/server/services/auth/verify-reset-code";
import { createVerifyCookieValue } from "@/lib/auth/hmac";
import crypto from "crypto";

const EMAIL = "test@example.com";
const EMAIL_HASH = crypto.createHash("sha256").update(EMAIL).digest("hex");
const TOKEN_ID = "token-id-1";

function makeValidCookie() {
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const value = createVerifyCookieValue(EMAIL_HASH, TOKEN_ID, expiresAt);
  return `reset_verify_token=${value}`;
}

function makeRequest(body: unknown, cookie?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = cookie;
  return new Request("http://localhost/api/auth/reset-password/verify", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/reset-password/verify", () => {
  describe("正常系", () => {
    it("200: コード検証成功・reset_token クッキー発行・reset_verify_token 削除", async () => {
      (verifyResetCode as Mock).mockResolvedValue({ status: "ok", tokenId: "new-token-id" });

      const res = await POST(makeRequest({ code: "123456" }, makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBeTruthy();
      const setCookie = res.headers.get("set-cookie") ?? "";
      expect(setCookie).toMatch(/reset_token=/);
      expect(setCookie).toMatch(/reset_verify_token=;/);
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: code が未指定", async () => {
      const res = await POST(makeRequest({}, makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual(expect.objectContaining({ field: "code" }));
    });

    it("401: クッキーがない", async () => {
      const res = await POST(makeRequest({ code: "123456" }));
      expect(res.status).toBe(401);
    });

    it("401: HMAC が不正", async () => {
      const res = await POST(makeRequest({ code: "123456" }, "reset_verify_token=invalid.data.here.badsig"));
      expect(res.status).toBe(401);
    });
  });

  describe("異常系 — サービスエラー", () => {
    it("400: invalid → reset_verify_token は維持", async () => {
      (verifyResetCode as Mock).mockResolvedValue({ status: "error", reason: "invalid" });

      const res = await POST(makeRequest({ code: "000000" }, makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.reason).toBe("invalid");
    });

    it("400: expired → reset_verify_token 削除", async () => {
      (verifyResetCode as Mock).mockResolvedValue({ status: "error", reason: "expired" });

      const res = await POST(makeRequest({ code: "123456" }, makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.reason).toBe("expired");
      expect(res.headers.get("set-cookie")).toMatch(/reset_verify_token=;/);
    });

    it("400: restart → reset_verify_token 削除", async () => {
      (verifyResetCode as Mock).mockResolvedValue({ status: "error", reason: "restart" });

      const res = await POST(makeRequest({ code: "000000" }, makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.reason).toBe("restart");
      expect(res.headers.get("set-cookie")).toMatch(/reset_verify_token=;/);
    });
  });
});
