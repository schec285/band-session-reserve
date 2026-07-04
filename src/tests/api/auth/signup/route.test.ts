import type { Mock } from "vitest";
import { POST } from "@/app/api/auth/signup/route";
import { makeCsrfPair } from "@/tests/helpers/csrf";

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
  password: "Str0ngP@ss12",
  confirmPassword: "Str0ngP@ss12",
  name: "テストユーザー",
};

function makeRequest(body: unknown) {
  const { cookieHeader, headers } = makeCsrfPair();
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader, ...headers },
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

    it("400: password が12文字未満", async () => {
      const res = await POST(makeRequest({ ...validBody, password: "Sh0rt!", confirmPassword: "Sh0rt!" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "password", message: "パスワードは12文字以上で入力してください" });
    });

    it("400: password が128文字を超える", async () => {
      const longPassword = "Aa1!" + "a".repeat(126);
      const res = await POST(makeRequest({ ...validBody, password: longPassword, confirmPassword: longPassword }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "password", message: "パスワードは128文字以下で入力してください" });
    });

    it("400: password に大文字を含まない", async () => {
      const res = await POST(makeRequest({ ...validBody, password: "str0ngp@ss12", confirmPassword: "str0ngp@ss12" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "password", message: "大文字を含めてください" });
    });

    it("400: password に小文字を含まない", async () => {
      const res = await POST(makeRequest({ ...validBody, password: "STR0NGP@SS12", confirmPassword: "STR0NGP@SS12" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "password", message: "小文字を含めてください" });
    });

    it("400: password に数字を含まない", async () => {
      const res = await POST(makeRequest({ ...validBody, password: "StrongPass@@", confirmPassword: "StrongPass@@" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "password", message: "数字を含めてください" });
    });

    it("400: password に記号を含まない", async () => {
      const res = await POST(makeRequest({ ...validBody, password: "Str0ngPass12", confirmPassword: "Str0ngPass12" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "password", message: "記号を含めてください" });
    });

    it("400: password の先頭・末尾に空白を含む", async () => {
      const res = await POST(makeRequest({ ...validBody, password: " Str0ngP@ss12", confirmPassword: " Str0ngP@ss12" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "password", message: "先頭・末尾に空白を含めないでください" });
    });

    it("400: password がメールアドレスのローカル部と類似している", async () => {
      const res = await POST(makeRequest({ ...validBody, password: "MyTest12345!", confirmPassword: "MyTest12345!" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({
        field: "password",
        message: "パスワードにメールアドレスや名前を含めることはできません",
      });
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

  describe("異常系 — CSRF", () => {
    it("403: CSRFトークンが不正な場合", async () => {
      const res = await POST(
        new Request("http://localhost/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        })
      );

      expect(res.status).toBe(403);
      expect(res.headers.get("X-CSRF-Error")).toBe("1");
    });
  });
});
