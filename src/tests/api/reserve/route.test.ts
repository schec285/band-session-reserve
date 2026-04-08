import type { Mock } from "vitest";
import { POST } from "@/app/api/reserve/route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/reserve/reservation", () => ({
  createReservations: vi.fn(),
}));

import { auth } from "@/auth";
import { createReservations } from "@/server/services/reserve/reservation";

const VALID_UUID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const VALID_UUID_2 = "8d0f7780-8536-51ef-a55c-f18fd2a01bf8";

const validBody = {
  entries: [
    { eventSongId: VALID_UUID, part: "vocal" },
  ],
  snsConsent: true,
  comment: "よろしくお願いします。",
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/reserve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue({ user: { id: "user-uuid" } });
  (createReservations as Mock).mockResolvedValue({ status: "ok" });
});

describe("POST /api/reserve", () => {
  describe("正常系", () => {
    it("200: 1件予約成功", async () => {
      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("予約を受け付けました！セッションでお待ちしています 🎵");
    });

    it("200: 複数件予約成功", async () => {
      const body = {
        ...validBody,
        entries: [
          { eventSongId: VALID_UUID, part: "vocal" },
          { eventSongId: VALID_UUID_2, part: "bass" },
        ],
      };
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(200);
    });

    it("createReservations に正しい引数が渡る", async () => {
      await POST(makeRequest(validBody));

      expect(createReservations).toHaveBeenCalledWith(
        expect.anything(),
        {
          userId: "user-uuid",
          entries: [{ eventSongId: VALID_UUID, part: "vocal" }],
          snsConsent: true,
          comment: "よろしくお願いします。",
        }
      );
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
  });

  describe("異常系 — バリデーション", () => {
    it("400: entries が未指定", async () => {
      const { entries: _, ...bodyWithoutEntries } = validBody;
      const res = await POST(makeRequest(bodyWithoutEntries));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("入力内容に誤りがあります");
    });

    it("400: entries が空配列", async () => {
      const res = await POST(makeRequest({ ...validBody, entries: [] }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("入力内容に誤りがあります");
    });

    it("400: entries[0].eventSongId が UUID 形式でない", async () => {
      const body = {
        ...validBody,
        entries: [{ eventSongId: "not-a-uuid", part: "vocal" }],
      };
      const res = await POST(makeRequest(body));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("入力内容に誤りがあります");
      expect(json.errors).toContainEqual(
        expect.objectContaining({ field: "entries.0.eventSongId" })
      );
    });

    it("400: entries[0].part が未指定", async () => {
      const body = {
        ...validBody,
        entries: [{ eventSongId: VALID_UUID, part: "" }],
      };
      const res = await POST(makeRequest(body));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("入力内容に誤りがあります");
      expect(json.errors).toContainEqual(
        expect.objectContaining({ field: "entries.0.part" })
      );
    });

    it("400: snsConsent が未指定", async () => {
      const { snsConsent: _, ...bodyWithoutSnsConsent } = validBody;
      const res = await POST(makeRequest(bodyWithoutSnsConsent));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("入力内容に誤りがあります");
      expect(json.errors).toContainEqual(
        expect.objectContaining({ field: "snsConsent" })
      );
    });
  });

  describe("異常系 — サービスエラー", () => {
    it("404: イベント曲が存在しない", async () => {
      (createReservations as Mock).mockResolvedValue({ status: "not-found" });

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.message).toBe("イベント曲が見つかりません");
    });

    it("409: パートがすでに埋まっている", async () => {
      (createReservations as Mock).mockResolvedValue({ status: "filled" });

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.message).toBe("このパートはすでに埋まっています");
      expect(json.errors).toContainEqual({ field: "part", message: "このパートはすでに埋まっています" });
    });

    it("422: 受付終了", async () => {
      (createReservations as Mock).mockResolvedValue({ status: "closed" });

      const res = await POST(makeRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(422);
      expect(json.message).toBe("このイベントの受付は終了しています");
    });
  });
});
