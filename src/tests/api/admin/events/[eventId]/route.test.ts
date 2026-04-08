import type { Mock } from "vitest";
import { PUT, DELETE } from "@/app/api/admin/events/[eventId]/route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/admin/events", () => ({
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

import { auth } from "@/auth";
import { updateEvent, deleteEvent } from "@/server/services/admin/events";

const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
const futureEnd = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7 + 1000 * 60 * 60 * 3).toISOString();

const validBody = {
  title: "春のセッション（更新）",
  startAt: future,
  endAt: futureEnd,
  closedAt: null,
  venue: "渋谷スタジオ A",
  description: "更新しました。",
};

const mockEventResponse = {
  id: "event-uuid-1",
  ...validBody,
};

const params = Promise.resolve({ eventId: "event-uuid-1" });

function makeRequest(method: string, body?: unknown) {
  return new Request("http://localhost/api/admin/events/event-uuid-1", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue({ user: { id: "user-uuid", role: "admin" } });
  (updateEvent as Mock).mockResolvedValue({ status: "ok", event: mockEventResponse });
  (deleteEvent as Mock).mockResolvedValue({ status: "ok" });
});

// ---------------------------------------------------------------------------
// PUT
// ---------------------------------------------------------------------------

describe("PUT /api/admin/events/[eventId]", () => {
  describe("正常系", () => {
    it("200: イベント更新成功", async () => {
      const res = await PUT(makeRequest("PUT", validBody), { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.event.id).toBe("event-uuid-1");
      expect(json.event.title).toBe("春のセッション（更新）");
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (auth as Mock).mockResolvedValue(null);

      const res = await PUT(makeRequest("PUT", validBody), { params });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });

    it("403: admin 以外のロール", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: "user-uuid", role: "member" } });

      const res = await PUT(makeRequest("PUT", validBody), { params });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.message).toBe("権限がありません");
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: title が空", async () => {
      const res = await PUT(makeRequest("PUT", { ...validBody, title: "" }), { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "title", message: "タイトルは必須です" });
    });

    it("400: startAt が現在日時より前", async () => {
      const past = new Date(Date.now() - 1000 * 60 * 60).toISOString();
      const res = await PUT(makeRequest("PUT", { ...validBody, startAt: past }), { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({
        field: "startAt",
        message: "開始日時は現在日時より後に設定してください",
      });
    });

    it("400: endAt が startAt より前", async () => {
      const res = await PUT(makeRequest("PUT", { ...validBody, endAt: future, startAt: futureEnd }), { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({
        field: "endAt",
        message: "終了日時は開始日時より後に設定してください",
      });
    });
  });

  describe("異常系 — サービスエラー", () => {
    it("404: イベントが存在しない", async () => {
      (updateEvent as Mock).mockResolvedValue({ status: "not-found" });

      const res = await PUT(makeRequest("PUT", validBody), { params });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.message).toBe("イベントが見つかりません");
    });
  });
});

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

describe("DELETE /api/admin/events/[eventId]", () => {
  describe("正常系", () => {
    it("200: イベント削除成功", async () => {
      const res = await DELETE(makeRequest("DELETE"), { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("イベントを削除しました");
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (auth as Mock).mockResolvedValue(null);

      const res = await DELETE(makeRequest("DELETE"), { params });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });

    it("403: admin 以外のロール", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: "user-uuid", role: "member" } });

      const res = await DELETE(makeRequest("DELETE"), { params });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.message).toBe("権限がありません");
    });
  });

  describe("異常系 — サービスエラー", () => {
    it("404: イベントが存在しない", async () => {
      (deleteEvent as Mock).mockResolvedValue({ status: "not-found" });

      const res = await DELETE(makeRequest("DELETE"), { params });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.message).toBe("イベントが見つかりません");
    });
  });
});
