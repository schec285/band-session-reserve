import type { Mock } from "vitest";
import { GET } from "@/app/api/events/[eventId]/songs/route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/events/events", () => ({
  getEventSongs: vi.fn(),
}));

import { auth } from "@/auth";
import { getEventSongs } from "@/server/services/events/events";

const mockSongs = [
  {
    id: "song-uuid-1",
    title: "千本桜",
    artist: "黒うさP",
    reservations: [
      { part: "readGuitar",    username: "yamada_taro", isOwner: false },
      { part: "backingGuitar", username: null,          isOwner: false },
      { part: "bass",          username: null,          isOwner: false },
      { part: "drums",         username: "sato_hanako", isOwner: false },
      { part: "keyboard",      username: null,          isOwner: false },
      { part: "vocal",         username: null,          isOwner: false },
    ],
  },
];

const validParams = { eventId: "event-uuid-1" };

function makeRequest(eventId: string) {
  return new Request(`http://localhost/api/events/${eventId}/songs`, { method: "GET" });
}

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue(null);
  (getEventSongs as Mock).mockResolvedValue({ status: "ok", songs: mockSongs });
});

describe("GET /api/events/:eventId/songs", () => {
  describe("正常系", () => {
    it("200: 曲一覧と予約状況を返す", async () => {
      const res = await GET(makeRequest(validParams.eventId), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.songs).toEqual(mockSongs);
    });

    it("200: 曲が 0 件の場合は空配列を返す", async () => {
      (getEventSongs as Mock).mockResolvedValue({ status: "ok", songs: [] });

      const res = await GET(makeRequest(validParams.eventId), { params: validParams });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.songs).toEqual([]);
    });

    it("200: ログイン中の場合は session.user.id を getEventSongs に渡す", async () => {
      (auth as Mock).mockResolvedValue({ user: { id: "user-uuid-1" } });

      await GET(makeRequest(validParams.eventId), { params: validParams });

      expect(getEventSongs).toHaveBeenCalledWith(
        expect.anything(),
        validParams.eventId,
        "user-uuid-1"
      );
    });

    it("200: 未認証の場合は currentUserId を undefined で渡す", async () => {
      (auth as Mock).mockResolvedValue(null);

      await GET(makeRequest(validParams.eventId), { params: validParams });

      expect(getEventSongs).toHaveBeenCalledWith(
        expect.anything(),
        validParams.eventId,
        undefined
      );
    });
  });

  describe("異常系", () => {
    it("404: イベントが存在しない", async () => {
      (getEventSongs as Mock).mockResolvedValue({ status: "not-found" });

      const res = await GET(makeRequest("nonexistent-uuid"), { params: { eventId: "nonexistent-uuid" } });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.message).toBe("イベントが見つかりません");
    });
  });
});
