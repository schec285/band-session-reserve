import type { Mock } from "vitest";
import { PATCH } from "@/app/api/reserve/[reservationId]/route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/reserve/reservation", () => ({
  updateReservationPart: vi.fn(),
}));

import { auth } from "@/auth";
import { updateReservationPart } from "@/server/services/reserve/reservation";

const validBody = { part: "drums", isTransferable: false };
const validParams = Promise.resolve({ reservationId: "reservation-uuid" });

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/reserve/reservation-uuid", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue({ user: { id: "user-uuid" } });
  (updateReservationPart as Mock).mockResolvedValue({ status: "ok" });
});

describe("PATCH /api/reserve/:reservationId", () => {
  describe("正常系", () => {
    it("200: 更新成功", async () => {
      const res = await PATCH(makeRequest(validBody), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("予約を更新しました");
    });

    it("updateReservationPart に isTransferable が渡る", async () => {
      await PATCH(makeRequest({ part: "drums", isTransferable: true }), { params: validParams });

      expect(updateReservationPart).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ part: "drums", isTransferable: true })
      );
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (auth as Mock).mockResolvedValue(null);

      const res = await PATCH(makeRequest(validBody), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: part が未指定", async () => {
      const res = await PATCH(makeRequest({ isTransferable: false }), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("入力内容に誤りがあります");
      expect(json.errors).toContainEqual({ field: "part", message: "パートを選択してください" });
    });

    it("400: isTransferable が未指定", async () => {
      const res = await PATCH(makeRequest({ part: "drums" }), { params: validParams });
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
      (updateReservationPart as Mock).mockResolvedValue({ status: "forbidden" });

      const res = await PATCH(makeRequest(validBody), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.message).toBe("この操作は許可されていません");
    });

    it("404: 予約が存在しない", async () => {
      (updateReservationPart as Mock).mockResolvedValue({ status: "not-found" });

      const res = await PATCH(makeRequest(validBody), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.message).toBe("予約が見つかりません");
    });

    it("409: 変更後のパートが埋まっている", async () => {
      (updateReservationPart as Mock).mockResolvedValue({ status: "filled" });

      const res = await PATCH(makeRequest(validBody), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.message).toBe("このパートはすでに埋まっています");
      expect(json.errors).toContainEqual({ field: "part", message: "このパートはすでに埋まっています" });
    });

    it("422: 受付終了", async () => {
      (updateReservationPart as Mock).mockResolvedValue({ status: "closed" });

      const res = await PATCH(makeRequest(validBody), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(422);
      expect(json.message).toBe("このイベントの受付は終了しています");
    });
  });
});
