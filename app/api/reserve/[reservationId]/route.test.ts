import { PATCH, DELETE } from "./route";
import { NextRequest } from "next/server";
import { reservationStore } from "../store";
import type { Reservation } from "@/types/reserve";

// テスト用の固定値
const VALID_RESERVATION_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const OTHER_USER_RESERVATION_ID = "ffffffff-eeee-dddd-cccc-bbbbbbbbbbbb";
const CURRENT_USER_ID = "user-current";
const OTHER_USER_ID = "user-other";

/** 認証済みリクエストを生成 */
function makeAuthenticatedRequest(
  method: "PATCH" | "DELETE",
  reservationId: string,
  body?: unknown
): NextRequest {
  return new NextRequest(
    `http://localhost/api/reserve/${reservationId}`,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        Cookie: "session=valid-session-token",
        Authorization: "Bearer valid-api-token",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }
  );
}

/** 未認証リクエストを生成 */
function makeUnauthenticatedRequest(
  method: "PATCH" | "DELETE",
  reservationId: string,
  body?: unknown
): NextRequest {
  return new NextRequest(
    `http://localhost/api/reserve/${reservationId}`,
    {
      method,
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }
  );
}

/** params を生成（Next.js App Router の動的ルート形式） */
function makeParams(reservationId: string) {
  return { params: Promise.resolve({ reservationId }) };
}

// テスト用の予約データをストアにセット
function seedReservation(id: string, userId: string): Reservation {
  const reservation: Reservation = {
    id,
    userId,
    songTitle: "千本桜",
    parts: ["guitar", "vocal"],
    snsConsent: true,
    comment: "よろしくお願いします",
    createdAt: "2026-03-31T00:00:00.000Z",
  };
  reservationStore.set(id, reservation);
  return reservation;
}

beforeEach(() => {
  reservationStore.clear();
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/reserve/:reservationId
// ─────────────────────────────────────────────────────────────
describe("PATCH /api/reserve/:reservationId", () => {
  describe("正常系", () => {
    it("有効なパートで 200 と success:true を返す", async () => {
      seedReservation(VALID_RESERVATION_ID, CURRENT_USER_ID);

      const res = await PATCH(
        makeAuthenticatedRequest("PATCH", VALID_RESERVATION_ID, {
          parts: ["bass"],
        }),
        makeParams(VALID_RESERVATION_ID)
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe("予約を更新しました");
    });

    it("更新後の parts がストアに反映されている", async () => {
      seedReservation(VALID_RESERVATION_ID, CURRENT_USER_ID);

      await PATCH(
        makeAuthenticatedRequest("PATCH", VALID_RESERVATION_ID, {
          parts: ["drums"],
        }),
        makeParams(VALID_RESERVATION_ID)
      );

      expect(reservationStore.get(VALID_RESERVATION_ID)?.parts).toEqual([
        "drums",
      ]);
    });

    it("複数のパートを指定できる", async () => {
      seedReservation(VALID_RESERVATION_ID, CURRENT_USER_ID);

      const res = await PATCH(
        makeAuthenticatedRequest("PATCH", VALID_RESERVATION_ID, {
          parts: ["vocal", "keyboard"],
        }),
        makeParams(VALID_RESERVATION_ID)
      );

      expect(res.status).toBe(200);
    });
  });

  describe("認証エラー", () => {
    it("Cookie がないとき 401 を返す", async () => {
      seedReservation(VALID_RESERVATION_ID, CURRENT_USER_ID);

      const res = await PATCH(
        makeUnauthenticatedRequest("PATCH", VALID_RESERVATION_ID, {
          parts: ["bass"],
        }),
        makeParams(VALID_RESERVATION_ID)
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.message).toBe("認証が必要です");
    });
  });

  describe("権限エラー", () => {
    it("他ユーザーの予約を変更しようとすると 403 を返す", async () => {
      seedReservation(OTHER_USER_RESERVATION_ID, OTHER_USER_ID);

      const res = await PATCH(
        makeAuthenticatedRequest("PATCH", OTHER_USER_RESERVATION_ID, {
          parts: ["bass"],
        }),
        makeParams(OTHER_USER_RESERVATION_ID)
      );
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.message).toBe("この操作は許可されていません");
    });
  });

  describe("Not Found", () => {
    it("存在しない reservationId のとき 404 を返す", async () => {
      const res = await PATCH(
        makeAuthenticatedRequest("PATCH", "nonexistent-id", {
          parts: ["bass"],
        }),
        makeParams("nonexistent-id")
      );
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.message).toBe("予約が見つかりません");
    });
  });

  describe("バリデーションエラー", () => {
    it("parts が空配列のとき 400 を返す", async () => {
      seedReservation(VALID_RESERVATION_ID, CURRENT_USER_ID);

      const res = await PATCH(
        makeAuthenticatedRequest("PATCH", VALID_RESERVATION_ID, {
          parts: [],
        }),
        makeParams(VALID_RESERVATION_ID)
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toBe("パートは1つ以上指定してください");
    });

    it("parts が未指定のとき 400 を返す", async () => {
      seedReservation(VALID_RESERVATION_ID, CURRENT_USER_ID);

      const res = await PATCH(
        makeAuthenticatedRequest("PATCH", VALID_RESERVATION_ID, {}),
        makeParams(VALID_RESERVATION_ID)
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe("パートは1つ以上指定してください");
    });

    it("parts に不正値が含まれるとき 400 を返す", async () => {
      seedReservation(VALID_RESERVATION_ID, CURRENT_USER_ID);

      const res = await PATCH(
        makeAuthenticatedRequest("PATCH", VALID_RESERVATION_ID, {
          parts: ["saxophone"],
        }),
        makeParams(VALID_RESERVATION_ID)
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toBe("パートが不正です");
    });
  });
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/reserve/:reservationId
// ─────────────────────────────────────────────────────────────
describe("DELETE /api/reserve/:reservationId", () => {
  describe("正常系", () => {
    it("予約を削除して 200 と success:true を返す", async () => {
      seedReservation(VALID_RESERVATION_ID, CURRENT_USER_ID);

      const res = await DELETE(
        makeAuthenticatedRequest("DELETE", VALID_RESERVATION_ID),
        makeParams(VALID_RESERVATION_ID)
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe("予約をキャンセルしました");
    });

    it("削除後にストアから予約が消えている", async () => {
      seedReservation(VALID_RESERVATION_ID, CURRENT_USER_ID);

      await DELETE(
        makeAuthenticatedRequest("DELETE", VALID_RESERVATION_ID),
        makeParams(VALID_RESERVATION_ID)
      );

      expect(reservationStore.has(VALID_RESERVATION_ID)).toBe(false);
    });
  });

  describe("認証エラー", () => {
    it("Cookie がないとき 401 を返す", async () => {
      seedReservation(VALID_RESERVATION_ID, CURRENT_USER_ID);

      const res = await DELETE(
        makeUnauthenticatedRequest("DELETE", VALID_RESERVATION_ID),
        makeParams(VALID_RESERVATION_ID)
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.message).toBe("認証が必要です");
    });
  });

  describe("権限エラー", () => {
    it("他ユーザーの予約を削除しようとすると 403 を返す", async () => {
      seedReservation(OTHER_USER_RESERVATION_ID, OTHER_USER_ID);

      const res = await DELETE(
        makeAuthenticatedRequest("DELETE", OTHER_USER_RESERVATION_ID),
        makeParams(OTHER_USER_RESERVATION_ID)
      );
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.message).toBe("この操作は許可されていません");
    });
  });

  describe("Not Found", () => {
    it("存在しない reservationId のとき 404 を返す", async () => {
      const res = await DELETE(
        makeAuthenticatedRequest("DELETE", "nonexistent-id"),
        makeParams("nonexistent-id")
      );
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.message).toBe("予約が見つかりません");
    });
  });
});
