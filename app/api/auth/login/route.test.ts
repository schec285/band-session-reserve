import { POST } from "./route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  describe("正常系", () => {
    it("正しい認証情報で 200・token・Set-Cookie を返す", async () => {
      const res = await POST(
        makeRequest({
          email: "yamada@example.com",
          password: "p@ssw0rd",
        })
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe("ログインしました");
      // API トークンが返る
      expect(typeof body.token).toBe("string");
      expect(body.token.length).toBeGreaterThan(0);
      // Set-Cookie ヘッダーにセッションクッキーが含まれる
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toMatch(/session=/);
      expect(setCookie).toMatch(/HttpOnly/i);
      expect(setCookie).toMatch(/SameSite=Strict/i);
    });
  });

  describe("異常系", () => {
    it("メールアドレスが未登録のとき 401 を返す", async () => {
      const res = await POST(
        makeRequest({
          email: "notfound@example.com",
          password: "p@ssw0rd",
        })
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.message).toBe(
        "メールアドレスまたはパスワードが正しくありません"
      );
    });

    it("パスワードが誤っているとき 401 を返す", async () => {
      const res = await POST(
        makeRequest({
          email: "yamada@example.com",
          password: "wrongpassword",
        })
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.message).toBe(
        "メールアドレスまたはパスワードが正しくありません"
      );
    });

    it("email が空のとき 400 を返す", async () => {
      const res = await POST(
        makeRequest({ email: "", password: "p@ssw0rd" })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("password が空のとき 400 を返す", async () => {
      const res = await POST(
        makeRequest({ email: "yamada@example.com", password: "" })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
    });
  });
});
