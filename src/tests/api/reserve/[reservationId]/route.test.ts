import { PATCH } from "@/app/api/reserve/[reservationId]/route";

jest.mock("@/server/services/reserve/reservation", () => ({
  updateReservationPart: jest.fn(),
}));

import { updateReservationPart } from "@/server/services/reserve/reservation";

const validBody = { part: "drums" };
const validParams = Promise.resolve({ reservationId: "reservation-uuid" });

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/reserve/reservation-uuid", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
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
