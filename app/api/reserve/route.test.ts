import { POST, GET } from "./route";
import { NextRequest } from "next/server";

// テスト用の既知イベントID（実装側でこのIDを許可する）
const VALID_EVENT_ID = "550e8400-e29b-41d4-a716-446655440000";

function makeRequest(options: {
  body?: unknown;
  sessionToken?: string;
  apiToken?: string;
}): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.sessionToken) {
    headers["Cookie"] = `session=${options.sessionToken}`;
  }
  if (options.apiToken) {
    headers["Authorization"] = `Bearer ${options.apiToken}`;
  }

  return new NextRequest("http://localhost/api/reserve", {
    method: "POST",
    headers,
    body: JSON.stringify(options.body ?? {}),
  });
}

/** 認証済みリクエストを作るショートカット */
function makeAuthenticatedRequest(body: unknown): NextRequest {
  return makeRequest({
    body,
    sessionToken: "valid-session-token",
    apiToken: "valid-api-token",
  });
}

describe("POST /api/reserve", () => {
  describe("正常系", () => {
    it("有効なデータで 200 と success:true を返す", async () => {
      const res = await POST(
        makeAuthenticatedRequest({
          eventId: VALID_EVENT_ID,
          songTitle: "千本桜",
          part: "guitar",
          snsConsent: true,
        })
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe(
        "予約を受け付けました！セッションでお待ちしています 🎵"
      );
    });

    it("comment は省略可能", async () => {
      const res = await POST(
        makeAuthenticatedRequest({
          eventId: VALID_EVENT_ID,
          songTitle: "千本桜",
          part: "guitar",
          snsConsent: false,
          // comment なし
        })
      );
      expect(res.status).toBe(200);
    });

    it("snsConsent が false でも受け付ける", async () => {
      const res = await POST(
        makeAuthenticatedRequest({
          eventId: VALID_EVENT_ID,
          songTitle: "Hello",
          part: "vocal",
          snsConsent: false,
        })
      );
      expect(res.status).toBe(200);
    });
  });

  describe("認証エラー", () => {
    it("Cookie がないとき 401 を返す", async () => {
      const res = await POST(
        makeRequest({
          body: {
            eventId: VALID_EVENT_ID,
            songTitle: "千本桜",
            part: "guitar",
            snsConsent: true,
          },
          apiToken: "valid-api-token",
          // sessionToken なし
        })
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.message).toBe("認証が必要です");
    });

    it("Authorization ヘッダーがないとき 401 を返す", async () => {
      const res = await POST(
        makeRequest({
          body: {
            eventId: VALID_EVENT_ID,
            songTitle: "千本桜",
            part: "guitar",
            snsConsent: true,
          },
          sessionToken: "valid-session-token",
          // apiToken なし
        })
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.message).toBe("認証が必要です");
    });
  });

  describe("バリデーションエラー", () => {
    it("eventId が空のとき 400 を返す", async () => {
      const res = await POST(
        makeAuthenticatedRequest({
          eventId: "",
          songTitle: "千本桜",
          part: "guitar",
          snsConsent: true,
        })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toBe("イベントIDが不正です");
    });

    it("eventId が存在しない UUID のとき 404 を返す", async () => {
      const res = await POST(
        makeAuthenticatedRequest({
          eventId: "00000000-0000-0000-0000-000000000000",
          songTitle: "千本桜",
          part: "guitar",
          snsConsent: true,
        })
      );
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.message).toBe("指定されたイベントが見つかりません");
    });

    it("songTitle が空のとき 400 を返す", async () => {
      const res = await POST(
        makeAuthenticatedRequest({
          eventId: VALID_EVENT_ID,
          songTitle: "",
          part: "guitar",
          snsConsent: true,
        })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toBe("曲名は必須です");
    });

    it("songTitle がスペースのみのとき 400 を返す", async () => {
      const res = await POST(
        makeAuthenticatedRequest({
          eventId: VALID_EVENT_ID,
          songTitle: "   ",
          part: "guitar",
          snsConsent: true,
        })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe("曲名は必須です");
    });

    it("part が不正値のとき 400 を返す", async () => {
      const res = await POST(
        makeAuthenticatedRequest({
          eventId: VALID_EVENT_ID,
          songTitle: "千本桜",
          part: "saxophone", // 許可外
          snsConsent: true,
        })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toBe("パートが不正です");
    });

    it("part が未指定のとき 400 を返す", async () => {
      const res = await POST(
        makeAuthenticatedRequest({
          eventId: VALID_EVENT_ID,
          songTitle: "千本桜",
          // part なし
          snsConsent: true,
        })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe("パートが不正です");
    });

    it("snsConsent が boolean でないとき 400 を返す", async () => {
      const res = await POST(
        makeAuthenticatedRequest({
          eventId: VALID_EVENT_ID,
          songTitle: "千本桜",
          part: "guitar",
          snsConsent: "yes", // boolean ではない
        })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toBe("SNS同意の値が不正です");
    });
  });

  describe("その他", () => {
    it("GET は 405 を返す", async () => {
      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(405);
      expect(body.success).toBe(false);
      expect(body.message).toBe("Method Not Allowed");
    });

    it("不正な JSON のとき 500 を返す", async () => {
      const req = new NextRequest("http://localhost/api/reserve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "session=valid-session-token",
          Authorization: "Bearer valid-api-token",
        },
        body: "invalid-json",
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.success).toBe(false);
    });
  });
});
