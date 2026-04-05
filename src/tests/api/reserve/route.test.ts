import { POST } from "@/app/api/reserve/route";

jest.mock("@/server/services/csrf/csrf", () => ({
  validateCsrfToken: jest.fn(),
}));

jest.mock("@/server/services/auth/session", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/server/services/reserve/reservation", () => ({
  createReservation: jest.fn(),
}));

import { validateCsrfToken } from "@/server/services/csrf/csrf";
import { getSession } from "@/server/services/auth/session";
import { createReservation } from "@/server/services/reserve/reservation";

const validBody = {
  eventSongId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  part: "vocal",
  snsConsent: true,
  comment: "よろしくお願いします。",
};

function makeRequest(body: unknown, csrfToken = "valid-csrf-token", withSession = true) {
  return new Request("http://localhost/api/reserve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
      ...(withSession ? { Cookie: "session=valid-session-token" } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (validateCsrfToken as jest.Mock).mockReturnValue(true);
  (getSession as jest.Mock).mockResolvedValue({ userId: "user-uuid" });
  (createReservation as jest.Mock).mockResolvedValue({ status: "ok" });
});

describe("POST /api/reserve", () => {
  describe("正常系", () => {
    it("200: 予約成功", async () => {
      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("予約を受け付けました！セッションでお待ちしています 🎵");
    });
  });

  describe("異常系 — CSRF", () => {
    it("403: CSRFトークンが無効", async () => {
      (validateCsrfToken as jest.Mock).mockReturnValue(false);

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.message).toBe("CSRFトークンが無効です");
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: eventSongId が空", async () => {
      const res = await POST(makeRequest({ ...validBody, eventSongId: "" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("イベント曲IDが不正です");
      expect(json.errors).toBeUndefined();
    });

    it("400: eventSongId が UUID 形式でない", async () => {
      const res = await POST(makeRequest({ ...validBody, eventSongId: "not-a-uuid" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("イベント曲IDが不正です");
      expect(json.errors).toBeUndefined();
    });

    it("400: part が未指定", async () => {
      const { part: _, ...bodyWithoutPart } = validBody;
      const res = await POST(makeRequest(bodyWithoutPart));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("入力内容に誤りがあります");
      expect(json.errors).toContainEqual({ field: "part", message: "パートを選択してください" });
    });

    it("400: snsConsent が未指定", async () => {
      const { snsConsent: _, ...bodyWithoutSnsConsent } = validBody;
      const res = await POST(makeRequest(bodyWithoutSnsConsent));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("入力内容に誤りがあります");
      expect(json.errors).toContainEqual({ field: "snsConsent", message: "選択してください" });
    });

    it("400: part と snsConsent が両方未指定", async () => {
      const { part: _p, snsConsent: _s, ...bodyWithoutBoth } = validBody;
      const res = await POST(makeRequest(bodyWithoutBoth));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("入力内容に誤りがあります");
      expect(json.errors).toContainEqual({ field: "part", message: "パートを選択してください" });
      expect(json.errors).toContainEqual({ field: "snsConsent", message: "選択してください" });
    });
  });

  describe("異常系 — サービスエラー", () => {
    it("404: イベント曲が存在しない", async () => {
      (createReservation as jest.Mock).mockResolvedValue({ status: "not-found" });

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.message).toBe("イベント曲が見つかりません");
    });

    it("409: パートがすでに埋まっている", async () => {
      (createReservation as jest.Mock).mockResolvedValue({ status: "filled" });

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.message).toBe("このパートはすでに埋まっています");
      expect(json.errors).toContainEqual({ field: "part", message: "このパートはすでに埋まっています" });
    });

    it("422: 受付終了", async () => {
      (createReservation as jest.Mock).mockResolvedValue({ status: "closed" });

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(422);
      expect(json.message).toBe("このイベントの受付は終了しています");
    });
  });
});
