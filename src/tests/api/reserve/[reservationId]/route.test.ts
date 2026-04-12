import type { Mock } from "vitest";
import { PUT } from "@/app/api/reserve/[reservationId]/route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/reserve/reservation", () => ({
  updateTransferable: vi.fn(),
  cancelReservation: vi.fn(),
}));

import { auth } from "@/auth";
import { updateTransferable } from "@/server/services/reserve/reservation";

const validBody = { isTransferable: true };
const validParams = Promise.resolve({ reservationId: "reservation-uuid" });

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/reserve/reservation-uuid", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue({ user: { id: "user-uuid" } });
  (updateTransferable as Mock).mockResolvedValue({ status: "ok" });
});

describe("PUT /api/reserve/:reservationId", () => {
  describe("正常系", () => {
    it("200: 更新成功", async () => {
      const res = await PUT(makeRequest(validBody), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("予約を更新しました");
    });

    it("updateTransferable に isTransferable: true が渡る", async () => {
      await PUT(makeRequest({ isTransferable: true }), { params: validParams });

      expect(updateTransferable).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ isTransferable: true })
      );
    });

    it("updateTransferable に isTransferable: false が渡る", async () => {
      await PUT(makeRequest({ isTransferable: false }), { params: validParams });

      expect(updateTransferable).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ isTransferable: false })
      );
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (auth as Mock).mockResolvedValue(null);

      const res = await PUT(makeRequest(validBody), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: isTransferable が未指定", async () => {
      const res = await PUT(makeRequest({}), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("入力内容に誤りがあります");
      expect(json.errors).toContainEqual(
        expect.objectContaining({ field: "isTransferable" })
      );
    });
  });

  describe("異常系 — サービスエラー", () => {
    it("403: 他ユーザーの予約を操作しようとした", async () => {
      (updateTransferable as Mock).mockResolvedValue({ status: "forbidden" });

      const res = await PUT(makeRequest(validBody), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.message).toBe("この操作は許可されていません");
    });

    it("404: 予約が存在しない", async () => {
      (updateTransferable as Mock).mockResolvedValue({ status: "not-found" });

      const res = await PUT(makeRequest(validBody), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.message).toBe("予約が見つかりません");
    });

    it("422: 受付終了", async () => {
      (updateTransferable as Mock).mockResolvedValue({ status: "closed" });

      const res = await PUT(makeRequest(validBody), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(422);
      expect(json.message).toBe("このイベントの受付は終了しています");
    });
  });
});
