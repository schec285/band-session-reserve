import { DELETE } from "@/app/api/reserve/[reservationId]/route";

jest.mock("@/server/services/csrf/csrf", () => ({
  validateCsrfToken: jest.fn(),
}));

jest.mock("@/server/services/auth/session", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/server/services/reserve/reservation", () => ({
  cancelReservation: jest.fn(),
}));

import { validateCsrfToken } from "@/server/services/csrf/csrf";
import { getSession } from "@/server/services/auth/session";
import { cancelReservation } from "@/server/services/reserve/reservation";

const validParams = { reservationId: "reservation-uuid" };

function makeRequest(csrfToken = "valid-csrf-token") {
  return new Request("http://localhost/api/reserve/reservation-uuid", {
    method: "DELETE",
    headers: {
      "X-CSRF-Token": csrfToken,
      Cookie: "session=valid-session-token",
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (validateCsrfToken as jest.Mock).mockReturnValue(true);
  (getSession as jest.Mock).mockResolvedValue({ userId: "user-uuid" });
  (cancelReservation as jest.Mock).mockResolvedValue({ status: "ok" });
});

describe("DELETE /api/reserve/:reservationId", () => {
  describe("正常系", () => {
    it("200: キャンセル成功", async () => {
      const res = await DELETE(makeRequest(), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("予約をキャンセルしました");
    });
  });

  describe("異常系 — CSRF", () => {
    it("403: CSRFトークンが無効", async () => {
      (validateCsrfToken as jest.Mock).mockReturnValue(false);

      const res = await DELETE(makeRequest(), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.message).toBe("CSRFトークンが無効です");
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const res = await DELETE(makeRequest(), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });
  });

  describe("異常系 — サービスエラー", () => {
    it("403: 他ユーザーの予約を操作しようとした", async () => {
      (cancelReservation as jest.Mock).mockResolvedValue({ status: "forbidden" });

      const res = await DELETE(makeRequest(), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.message).toBe("この操作は許可されていません");
    });

    it("404: 予約が存在しない", async () => {
      (cancelReservation as jest.Mock).mockResolvedValue({ status: "not-found" });

      const res = await DELETE(makeRequest(), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.message).toBe("予約が見つかりません");
    });

    it("422: 受付終了", async () => {
      (cancelReservation as jest.Mock).mockResolvedValue({ status: "closed" });

      const res = await DELETE(makeRequest(), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(422);
      expect(json.message).toBe("このイベントの受付は終了しています");
    });
  });
});
