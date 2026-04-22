import type { Mock } from "vitest";
import { POST } from "@/app/api/auth/reset-password/resend/route";

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

vi.mock("@/server/services/auth/resend-reset-code", () => ({
  resendResetCode: vi.fn(),
}));

import { resendResetCode } from "@/server/services/auth/resend-reset-code";
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

function makeRequest(cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers["Cookie"] = cookie;
  return new Request("http://localhost/api/auth/reset-password/resend", {
    method: "POST",
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/reset-password/resend", () => {
  describe("正常系", () => {
    it("200: 再送成功・新しい reset_verify_token クッキーが付与される", async () => {
      (resendResetCode as Mock).mockResolvedValue({ status: "ok", tokenId: "new-token-id" });

      const res = await POST(makeRequest(makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBeTruthy();
      const setCookie = res.headers.get("set-cookie") ?? "";
      expect(setCookie).toMatch(/reset_verify_token=/);
      expect(setCookie).not.toContain(TOKEN_ID);
    });
  });

  describe("異常系 — クッキー検証", () => {
    it("401: クッキーがない", async () => {
      const res = await POST(makeRequest());
      expect(res.status).toBe(401);
    });

    it("401: HMAC が不正", async () => {
      const res = await POST(makeRequest("reset_verify_token=invalid.data.here.badsig"));
      expect(res.status).toBe(401);
    });
  });

  describe("異常系 — サービスエラー", () => {
    it("401: invalid → クッキー削除", async () => {
      (resendResetCode as Mock).mockResolvedValue({ status: "error", reason: "invalid" });

      const res = await POST(makeRequest(makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.reason).toBe("restart");
      expect(res.headers.get("set-cookie")).toMatch(/reset_verify_token=;/);
    });

    it("401: expired → クッキー削除", async () => {
      (resendResetCode as Mock).mockResolvedValue({ status: "error", reason: "expired" });

      const res = await POST(makeRequest(makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.reason).toBe("expired");
      expect(res.headers.get("set-cookie")).toMatch(/reset_verify_token=;/);
    });
  });
});
