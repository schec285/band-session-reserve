import type { Mock } from "vitest";
import { POST } from "@/app/api/auth/reset-password/request/route";

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

vi.mock("@/server/services/auth/reset-password-request", () => ({
  requestPasswordReset: vi.fn(),
}));

import { requestPasswordReset } from "@/server/services/auth/reset-password-request";
import crypto from "crypto";

const EMAIL = "test@example.com";
const EMAIL_HASH = crypto.createHash("sha256").update(EMAIL).digest("hex");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/reset-password/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/reset-password/request", () => {
  describe("正常系", () => {
    it("200: reset_verify_token クッキーが発行される", async () => {
      (requestPasswordReset as Mock).mockResolvedValue({ status: "ok", tokenId: "token-id-1" });

      const res = await POST(makeRequest({ email: EMAIL }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBeTruthy();
      const setCookie = res.headers.get("set-cookie") ?? "";
      expect(setCookie).toMatch(/reset_verify_token=/);
      expect(setCookie).toMatch(new RegExp(EMAIL_HASH));
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: email が未指定", async () => {
      const res = await POST(makeRequest({}));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual(expect.objectContaining({ field: "email" }));
    });
  });
});
