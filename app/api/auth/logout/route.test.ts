import { POST } from "./route";
import { NextRequest } from "next/server";

function makeRequest(options?: {
  sessionToken?: string;
  apiToken?: string;
}): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options?.sessionToken) {
    headers["Cookie"] = `session=${options.sessionToken}`;
  }
  if (options?.apiToken) {
    headers["Authorization"] = `Bearer ${options.apiToken}`;
  }

  return new NextRequest("http://localhost/api/auth/logout", {
    method: "POST",
    headers,
  });
}

describe("POST /api/auth/logout", () => {
  describe("正常系", () => {
    it("有効な認証情報で 200 を返し Set-Cookie でセッションを削除する", async () => {
      const res = await POST(
        makeRequest({
          sessionToken: "valid-session-token",
          apiToken: "valid-api-token",
        })
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe("ログアウトしました");

      // Cookie を削除する Set-Cookie ヘッダーを確認
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toMatch(/session=/);
      expect(setCookie).toMatch(/Max-Age=0/i);
    });
  });

  describe("異常系", () => {
    it("Cookie がないとき 401 を返す", async () => {
      const res = await POST(makeRequest({ apiToken: "valid-api-token" }));
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.message).toBe("認証が必要です");
    });

    it("Authorization ヘッダーがないとき 401 を返す", async () => {
      const res = await POST(
        makeRequest({ sessionToken: "valid-session-token" })
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.message).toBe("認証が必要です");
    });

    it("Cookie・Authorization が両方ないとき 401 を返す", async () => {
      const res = await POST(makeRequest());
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.message).toBe("認証が必要です");
    });
  });
});
