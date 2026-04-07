import { POST } from "@/app/api/auth/signup/route";

jest.mock("@/server/repositories/auth/user-repository.drizzle", () => ({
  DrizzleUserRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("@/server/services/auth/signup", () => ({
  signUp: jest.fn(),
}));

import { signUp } from "@/server/services/auth/signup";

const validBody = {
  email: "test@example.com",
  password: "password123",
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
  jest.clearAllMocks();
  (signUp as jest.Mock).mockResolvedValue({ status: "ok" });
});

describe("POST /api/auth/signup", () => {
  describe("正常系", () => {
    it("201: ユーザー登録成功", async () => {
      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.message).toBe("ユーザー登録が完了しました");
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
      const res = await POST(makeRequest({ ...validBody, password: "short" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "password", message: "パスワードは8文字以上で入力してください" });
    });
  });

  describe("異常系 — サービスエラー", () => {
    it("409: メールアドレス重複", async () => {
      (signUp as jest.Mock).mockResolvedValue({ status: "duplicate" });

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.message).toBe("このメールアドレスはすでに登録されています");
    });
  });
});
