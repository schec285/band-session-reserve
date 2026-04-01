import { generateChallenge, validateChallenge } from "../challenge";

jest.mock("@/lib/db", () => ({
  db: {
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
  },
}));

import { db } from "@/lib/db";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("generateChallenge", () => {
  it("文字列を返す", () => {
    (db.insert as jest.Mock).mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined),
    });

    const challenge = generateChallenge();
    expect(typeof challenge).toBe("string");
    expect(challenge.length).toBeGreaterThan(0);
  });

  it("呼び出すたびに異なる値を返す", () => {
    const challenge1 = generateChallenge();
    const challenge2 = generateChallenge();
    expect(challenge1).not.toBe(challenge2);
  });
});

describe("validateChallenge", () => {
  it("有効なチャレンジは true を返す", async () => {
    (db.select as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([
          { id: "challenge-id", usedAt: null, expiresAt: new Date(Date.now() + 60000) },
        ]),
      }),
    });
    (db.update as jest.Mock).mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    });

    expect(await validateChallenge("valid-challenge")).toBe(true);
  });

  it("存在しないチャレンジは false を返す", async () => {
    (db.select as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    });

    expect(await validateChallenge("unknown-challenge")).toBe(false);
  });

  it("有効期限切れのチャレンジは false を返す", async () => {
    (db.select as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([
          { id: "challenge-id", usedAt: null, expiresAt: new Date(Date.now() - 1000) },
        ]),
      }),
    });

    expect(await validateChallenge("expired-challenge")).toBe(false);
  });

  it("使用済みのチャレンジは false を返す", async () => {
    (db.select as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([
          { id: "challenge-id", usedAt: new Date(), expiresAt: new Date(Date.now() + 60000) },
        ]),
      }),
    });

    expect(await validateChallenge("used-challenge")).toBe(false);
  });
});
