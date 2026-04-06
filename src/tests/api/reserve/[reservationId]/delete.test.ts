import { DELETE } from "@/app/api/reserve/[reservationId]/route";

jest.mock("@/server/services/reserve/reservation", () => ({
  cancelReservation: jest.fn(),
}));

import { cancelReservation } from "@/server/services/reserve/reservation";

const validParams = Promise.resolve({ reservationId: "reservation-uuid" });

function makeRequest() {
  return new Request("http://localhost/api/reserve/reservation-uuid", {
    method: "DELETE",
  });
}

beforeEach(() => {
  jest.clearAllMocks();
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
