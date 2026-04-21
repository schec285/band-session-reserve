import type { Mock } from "vitest";
import { POST } from "@/app/api/auth/signup/route";

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

vi.mock("@/server/services/auth/signup", () => ({
  signUp: vi.fn(),
}));

import { signUp } from "@/server/services/auth/signup";

const validBody = {
  email: "test@example.com",
  password: "password123",
  confirmPassword: "password123",
  name: "テストユーザー",
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (signUp as Mock).mockResolvedValue({ status: "ok", tokenId: "token-id-1" });
});

describe("POST /api/auth/signup", () => {
  describe("正常系", () => {
    it("201: クッキーを付与してレスポンスを返す", async () => {
      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.message).toBe("確認メールを送信しました");

      // HMAC クッキーが付与されている
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toMatch(/signup_verify_token=/);
      expect(setCookie).toMatch(/HttpOnly/);
      expect(setCookie).toMatch(/Path=\//);
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: email が未指定", async () => {
      const { email: _, ...body } = validBody;
      const res = await POST(makeRequest(body));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "email", message: "メールアドレスを入力してください" });
    });

    it("400: password が未指定", async () => {
      const { password: _, ...body } = validBody;
      const res = await POST(makeRequest(body));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "password", message: "パスワードを入力してください" });
    });

    it("400: name が未指定", async () => {
      const { name: _, ...body } = validBody;
      const res = await POST(makeRequest(body));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "name", message: "名前を入力してください" });
    });

    it("400: password が8文字未満", async () => {
      const res = await POST(makeRequest({ ...validBody, password: "short", confirmPassword: "short" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "password", message: "パスワードは8文字以上で入力してください" });
    });

    it("400: confirmPassword が未指定", async () => {
      const { confirmPassword: _, ...body } = validBody;
      const res = await POST(makeRequest(body));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "confirmPassword", message: "確認用パスワードを入力してください" });
    });

    it("400: confirmPassword が password と不一致", async () => {
      const res = await POST(makeRequest({ ...validBody, confirmPassword: "different123" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "confirmPassword", message: "パスワードが一致しません" });
    });
  });
});
