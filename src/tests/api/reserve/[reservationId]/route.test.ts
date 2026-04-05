import { PATCH } from "@/app/api/reserve/[reservationId]/route";

jest.mock("@/server/services/csrf/csrf", () => ({
  validateCsrfToken: jest.fn(),
}));

jest.mock("@/server/services/auth/session", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/server/services/reserve/reservation", () => ({
  updateReservationPart: jest.fn(),
}));

import { validateCsrfToken } from "@/server/services/csrf/csrf";
import { getSession } from "@/server/services/auth/session";
import { updateReservationPart } from "@/server/services/reserve/reservation";

const validBody = { part: "drums" };
const validParams = { reservationId: "reservation-uuid" };

function makeRequest(body: unknown, csrfToken = "valid-csrf-token") {
  return new Request("http://localhost/api/reserve/reservation-uuid", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
      Cookie: "session=valid-session-token",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (validateCsrfToken as jest.Mock).mockReturnValue(true);
  (getSession as jest.Mock).mockResolvedValue({ userId: "user-uuid" });
  (updateReservationPart as jest.Mock).mockResolvedValue({ status: "ok" });
});

describe("PATCH /api/reserve/:reservationId", () => {
  describe("正常系", () => {
    it("200: 更新成功", async () => {
      const res = await PATCH(makeRequest(validBody), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("予約を更新しました");
    });
  });

  describe("異常系 — CSRF", () => {
    it("403: CSRFトークンが無効", async () => {
      (validateCsrfToken as jest.Mock).mockReturnValue(false);

      const res = await PATCH(makeRequest(validBody), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.message).toBe("CSRFトークンが無効です");
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const res = await PATCH(makeRequest(validBody), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: part が未指定", async () => {
      const res = await PATCH(makeRequest({}), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("入力内容に誤りがあります");
      expect(json.errors).toContainEqual({ field: "part", message: "パートを選択してください" });
    });
  });

  describe("異常系 — サービスエラー", () => {
    it("403: 他ユーザーの予約を操作しようとした", async () => {
      (updateReservationPart as jest.Mock).mockResolvedValue({ status: "forbidden" });

      const res = await PATCH(makeRequest(validBody), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.message).toBe("この操作は許可されていません");
    });

    it("404: 予約が存在しない", async () => {
      (updateReservationPart as jest.Mock).mockResolvedValue({ status: "not-found" });

      const res = await PATCH(makeRequest(validBody), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.message).toBe("予約が見つかりません");
    });

    it("409: 変更後のパートが埋まっている", async () => {
      (updateReservationPart as jest.Mock).mockResolvedValue({ status: "filled" });

      const res = await PATCH(makeRequest(validBody), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.message).toBe("このパートはすでに埋まっています");
      expect(json.errors).toContainEqual({ field: "part", message: "このパートはすでに埋まっています" });
    });

    it("422: 受付終了", async () => {
      (updateReservationPart as jest.Mock).mockResolvedValue({ status: "closed" });

      const res = await PATCH(makeRequest(validBody), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(422);
      expect(json.message).toBe("このイベントの受付は終了しています");
    });
  });
});
