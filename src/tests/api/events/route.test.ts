import { GET } from "@/app/api/events/route";

jest.mock("@/server/services/events/events", () => ({
  getEvents: jest.fn(),
}));

import { getEvents } from "@/server/services/events/events";

const mockEvents = [
  {
    id: "event-uuid-1",
    title: "春のバンドセッション 2026",
    startAt: "2026-04-20T10:00:00+09:00",
    endAt: "2026-04-20T18:00:00+09:00",
    closedAt: null,
    venue: "渋谷スタジオ A",
    description: "春の定期セッションです。初心者歓迎！",
  },
  {
    id: "event-uuid-2",
    title: "冬のバンドセッション 2025",
    startAt: "2025-12-15T12:00:00+09:00",
    endAt: "2025-12-15T20:00:00+09:00",
    closedAt: "2025-12-10T23:59:59+09:00",
    venue: "新宿スタジオ B",
    description: "年末の締めくくりセッションでした。",
  },
];

function makeRequest() {
  return new Request("http://localhost/api/events", { method: "GET" });
}

beforeEach(() => {
  jest.clearAllMocks();
  (getEvents as jest.Mock).mockResolvedValue(mockEvents);
});

describe("GET /api/events", () => {
  describe("正常系", () => {
    it("200: イベント一覧を返す", async () => {
      const res = await GET(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.events).toEqual(mockEvents);
    });

    it("200: イベントが 0 件の場合は空配列を返す", async () => {
      (getEvents as jest.Mock).mockResolvedValue([]);

      const res = await GET(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.events).toEqual([]);
    });
  });
});
