import { POST } from "./route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  describe("正常系", () => {
    it("有効なデータで登録すると 201 と success:true を返す", async () => {
      const req = makeRequest({
        username: "山田太郎",
        email: "yamada@example.com",
        password: "p@ssw0rd",
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.message).toBe("ユーザー登録が完了しました");
    });
  });

  describe("バリデーションエラー", () => {
    it("username が空のとき 400 を返す", async () => {
      const req = makeRequest({
        username: "",
        email: "yamada@example.com",
        password: "p@ssw0rd",
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toBe("ユーザー名は必須です");
    });

    it("username がスペースのみのとき 400 を返す", async () => {
      const req = makeRequest({
        username: "   ",
        email: "yamada@example.com",
        password: "p@ssw0rd",
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe("ユーザー名は必須です");
    });

    it("email が不正な形式のとき 400 を返す", async () => {
      const req = makeRequest({
        username: "山田太郎",
        email: "not-an-email",
        password: "p@ssw0rd",
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toBe("メールアドレスの形式が不正です");
    });

    it("password が空のとき 400 を返す", async () => {
      const req = makeRequest({
        username: "山田太郎",
        email: "yamada@example.com",
        password: "",
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toBe("パスワードは必須です");
    });

    it("既に登録済みのメールアドレスのとき 400 を返す", async () => {
      const email = "duplicate@example.com";

      // 1回目の登録
      await POST(
        makeRequest({ username: "ユーザーA", email, password: "pass1" })
      );

      // 2回目（重複）
      const req = makeRequest({ username: "ユーザーB", email, password: "pass2" });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toBe("このメールアドレスは既に使用されています");
    });
  });

  describe("異常系", () => {
    it("不正な JSON のとき 500 を返す", async () => {
      const req = new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json",
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.success).toBe(false);
    });
  });
});
