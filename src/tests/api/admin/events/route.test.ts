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
import { makeCsrfPair } from "@/tests/helpers/csrf";

const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
const futureEnd = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7 + 1000 * 60 * 60 * 3).toISOString();

const validBody = {
  title: "春のセッション",
  startAt: future,
  endAt: futureEnd,
  closedAt: null,
  venue: "渋谷スタジオ A",
  venueFee: 3000,
  participationFee: 500,
  description: "春の定期セッションです。",
};

const mockEventResponse = {
  id: "event-uuid-1",
  ...validBody,
};

function makeRequest(body: unknown) {
  const { cookieHeader, headers } = makeCsrfPair();
  return new Request("http://localhost/api/admin/events", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader, ...headers },
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

    it("400: startAt が現在日時より前", async () => {
      const past = new Date(Date.now() - 1000 * 60 * 60).toISOString();
      const res = await POST(makeRequest({ ...validBody, startAt: past }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({
        field: "startAt",
        message: "開始日時は現在日時より後に設定してください",
      });
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

    it("400: mapEmbedUrl が Google マップの埋め込みURLとして不正（script混入）", async () => {
      const res = await POST(
        makeRequest({ ...validBody, mapEmbedUrl: `<script>alert(1)</script><iframe src="javascript:alert(1)"></iframe>` })
      );
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({
        field: "mapEmbedUrl",
        message: "Googleマップの埋め込みHTML（またはURL）が正しくありません",
      });
    });

    it("400: mapEmbedUrl のホストが google.com でない（オープンリダイレクト風）", async () => {
      const res = await POST(
        makeRequest({ ...validBody, mapEmbedUrl: `<iframe src="https://evil.com/maps/embed?pb=1"></iframe>` })
      );
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.errors).toContainEqual({
        field: "mapEmbedUrl",
        message: "Googleマップの埋め込みHTML（またはURL）が正しくありません",
      });
    });
  });

  describe("mapEmbedUrl", () => {
    it("201: 埋め込みHTMLから src の URL のみを抽出して作成する", async () => {
      const embedUrl = "https://www.google.com/maps/embed?pb=1";
      const html = `<iframe src="${embedUrl}" width="600" height="450" style="border:0;" allowfullscreen loading="lazy"></iframe>`;

      const res = await POST(makeRequest({ ...validBody, mapEmbedUrl: html }));

      expect(res.status).toBe(201);
      expect(createEvent).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ mapEmbedUrl: embedUrl })
      );
    });

    it("201: 未指定の場合は null として作成する", async () => {
      const res = await POST(makeRequest(validBody));

      expect(res.status).toBe(201);
      expect(createEvent).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ mapEmbedUrl: null })
      );
    });
  });

  describe("異常系 — CSRF", () => {
    it("403: CSRFトークンが不正な場合", async () => {
      const res = await POST(
        new Request("http://localhost/api/admin/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        })
      );

      expect(res.status).toBe(403);
      expect(res.headers.get("X-CSRF-Error")).toBe("1");
    });
  });
});
