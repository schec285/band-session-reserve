import type { Mock } from "vitest";
import { POST } from "@/app/api/admin/events/route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/admin/events", () => ({
  createEvent: vi.fn(),
}));

import { auth } from "@/auth";
import { createEvent } from "@/server/services/admin/events";

const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
const futureEnd = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7 + 1000 * 60 * 60 * 3).toISOString();

const validBody = {
  title: "春のセッション",
  startAt: future,
  endAt: futureEnd,
  closedAt: null,
  venue: "渋谷スタジオ A",
  description: "春の定期セッションです。",
};

const mockEventResponse = {
  id: "event-uuid-1",
  ...validBody,
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue({ user: { id: "user-uuid", role: "admin" } });
  (createEvent as Mock).mockResolvedValue({ status: "ok", event: mockEventResponse });
});

describe("POST /api/admin/events", () => {
  describe("正常系", () => {
    it("201: イベント作成成功", async () => {
      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.event.id).toBe("event-uuid-1");
      expect(json.event.title).toBe("春のセッション");
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (auth as Mock).mockResolvedValue(null);

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });

    it("403: admin 以外のロール", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: "user-uuid", role: "member" } });

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.message).toBe("権限がありません");
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: title が空", async () => {
      const res = await POST(makeRequest({ ...validBody, title: "" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({ field: "title", message: "タイトルは必須です" });
    });

    it("400: endAt が startAt より前", async () => {
      const res = await POST(makeRequest({ ...validBody, endAt: future, startAt: futureEnd }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({
        field: "endAt",
        message: "終了日時は開始日時より後に設定してください",
      });
    });

    it("400: closedAt が startAt より後", async () => {
      const closedAtAfterStart = new Date(Date.now() + 1000 * 60 * 60 * 24 * 8).toISOString();
      const res = await POST(makeRequest({ ...validBody, closedAt: closedAtAfterStart }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({
        field: "closedAt",
        message: "受付締切日時は開始日時以前に設定してください",
      });
    });
  });
});
