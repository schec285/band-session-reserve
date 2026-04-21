import type { Mock } from "vitest";
import { POST } from "@/app/api/auth/resend-verification/route";

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

vi.mock("@/server/services/auth/resend-verification", () => ({
  resendVerification: vi.fn(),
}));

import { resendVerification } from "@/server/services/auth/resend-verification";
import { createVerifyCookieValue } from "@/lib/auth/hmac";
import crypto from "crypto";

const EMAIL = "test@example.com";
const EMAIL_HASH = crypto.createHash("sha256").update(EMAIL).digest("hex");
const TOKEN_ID = "token-id-1";

function makeValidCookie() {
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const value = createVerifyCookieValue(EMAIL_HASH, TOKEN_ID, expiresAt);
  return `signup_verify_token=${value}`;
}

function makeRequest(cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers["Cookie"] = cookie;
  return new Request("http://localhost/api/auth/resend-verification", {
    method: "POST",
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/resend-verification", () => {
  describe("正常系", () => {
    it("200: 再送成功・新しいクッキーが付与される", async () => {
      (resendVerification as Mock).mockResolvedValue({ status: "ok", tokenId: "new-token-id" });

      const res = await POST(makeRequest(makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("認証コードを再送しました");
      const setCookie = res.headers.get("set-cookie") ?? "";
      expect(setCookie).toMatch(/signup_verify_token=/);
      // 新しい tokenId がクッキーに含まれていること（古い TOKEN_ID とは異なる値）
      expect(setCookie).not.toContain(TOKEN_ID);
    });
  });

  describe("異常系 — クッキー検証", () => {
    it("401: クッキーがない場合", async () => {
      const res = await POST(makeRequest());
      expect(res.status).toBe(401);
    });

    it("401: HMAC が不正な場合", async () => {
      const res = await POST(makeRequest("signup_verify_token=invalid.data.here.badsig"));
      expect(res.status).toBe(401);
    });
  });

  describe("異常系 — サービスエラー", () => {
    it("401: invalid → クッキー削除 + reason: restart", async () => {
      (resendVerification as Mock).mockResolvedValue({ status: "error", reason: "invalid" });

      const res = await POST(makeRequest(makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.reason).toBe("restart");
      expect(res.headers.get("set-cookie")).toMatch(/signup_verify_token=;/);
    });

    it("401: expired → クッキー削除 + reason: expired", async () => {
      (resendVerification as Mock).mockResolvedValue({ status: "error", reason: "expired" });

      const res = await POST(makeRequest(makeValidCookie()));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.reason).toBe("expired");
      expect(res.headers.get("set-cookie")).toMatch(/signup_verify_token=;/);
    });
  });
});
