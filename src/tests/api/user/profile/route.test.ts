import type { Mock } from "vitest";
import { GET, PUT } from "@/app/api/user/profile/route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/user/profile", () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}));

import { auth } from "@/auth";
import { getProfile, updateProfile } from "@/server/services/user/profile";
import { makeCsrfPair } from "@/tests/helpers/csrf";

const validBody = {
  name: "山田 太郎",
  part: "vocal",
  comment: "よろしくお願いします",
};

function makePutRequest(body: unknown) {
  const { cookieHeader, headers } = makeCsrfPair();
  return new Request("http://localhost/api/user/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader, ...headers },
    body: JSON.stringify(body),
  });
}

function makeGetRequest() {
  return new Request("http://localhost/api/user/profile", { method: "GET" });
}

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue({ user: { id: "user-uuid" } });
});

describe("GET /api/user/profile", () => {
  describe("正常系", () => {
    it("200: プロフィールを返す", async () => {
      (getProfile as Mock).mockResolvedValue({
        email: "user@example.com",
        name: "山田 太郎",
        part: "vocal",
        comment: "よろしく",
      });

      const res = await GET(makeGetRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({
        email: "user@example.com",
        name: "山田 太郎",
        part: "vocal",
        comment: "よろしく",
      });
    });

    it("getProfile に userId が渡される", async () => {
      (getProfile as Mock).mockResolvedValue({
        email: "user@example.com",
        name: "山田 太郎",
        part: null,
        comment: null,
      });

      await GET(makeGetRequest());

      expect(getProfile).toHaveBeenCalledWith(expect.anything(), "user-uuid");
    });
  });

  describe("異常系", () => {
    it("401: 未認証", async () => {
      (auth as Mock).mockResolvedValue(null);

      const res = await GET(makeGetRequest());
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });

    it("404: ユーザーが存在しない", async () => {
      (getProfile as Mock).mockResolvedValue(null);

      const res = await GET(makeGetRequest());
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.message).toBe("ユーザーが見つかりません");
    });
  });
});

describe("PUT /api/user/profile", () => {
  describe("正常系", () => {
    it("200: プロフィールを更新する", async () => {
      (updateProfile as Mock).mockResolvedValue(undefined);

      const res = await PUT(makePutRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("プロフィールを更新しました");
    });

    it("updateProfile に正しい引数が渡る", async () => {
      (updateProfile as Mock).mockResolvedValue(undefined);

      await PUT(makePutRequest(validBody));

      expect(updateProfile).toHaveBeenCalledWith(expect.anything(), "user-uuid", {
        name: "山田 太郎",
        part: "vocal",
        comment: "よろしくお願いします",
      });
    });

    it("200: part・comment が省略されても更新できる", async () => {
      (updateProfile as Mock).mockResolvedValue(undefined);

      const res = await PUT(makePutRequest({ name: "山田 太郎" }));

      expect(res.status).toBe(200);
    });
  });

  describe("異常系 — 認証", () => {
    it("401: 未認証", async () => {
      (auth as Mock).mockResolvedValue(null);

      const res = await PUT(makePutRequest(validBody));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.message).toBe("認証が必要です");
    });
  });

  describe("異常系 — バリデーション", () => {
    it("400: name が空文字", async () => {
      const res = await PUT(makePutRequest({ ...validBody, name: "" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("入力内容に誤りがあります");
      expect(json.errors).toContainEqual(expect.objectContaining({ field: "name" }));
    });

    it("400: name が未指定", async () => {
      const { name: _, ...bodyWithoutName } = validBody;
      const res = await PUT(makePutRequest(bodyWithoutName));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("入力内容に誤りがあります");
    });

    it("400: part が不正な値", async () => {
      const res = await PUT(makePutRequest({ ...validBody, part: "invalidPart" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("入力内容に誤りがあります");
      expect(json.errors).toContainEqual(expect.objectContaining({ field: "part" }));
    });
  });

  describe("異常系 — CSRF", () => {
    it("403: CSRFトークンが不正な場合", async () => {
      const res = await PUT(
        new Request("http://localhost/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        })
      );

      expect(res.status).toBe(403);
      expect(res.headers.get("X-CSRF-Error")).toBe("1");
    });
  });
});
