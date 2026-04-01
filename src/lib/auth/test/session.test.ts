import { createSession, getSession, invalidateSession } from "../session";

jest.mock("@/lib/db", () => ({
  db: {
    insert: jest.fn(),
    select: jest.fn(),
    delete: jest.fn(),
  },
}));

import { db } from "@/lib/db";

function makeRequest(cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers["Cookie"] = cookie;
  return new Request("http://localhost/", { headers });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createSession", () => {
  it("セッショントークンを返す", async () => {
    (db.insert as jest.Mock).mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined),
    });

    const token = await createSession("user-id");
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });
});

describe("getSession", () => {
  it("有効なセッションクッキーは userId を返す", async () => {
    (db.select as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ userId: "user-id" }]),
      }),
    });

    const session = await getSession(makeRequest("session=valid-token"));
    expect(session).toEqual({ userId: "user-id" });
  });

  it("セッションクッキーがない場合は null を返す", async () => {
    const session = await getSession(makeRequest());
    expect(session).toBeNull();
  });

  it("存在しないセッションは null を返す", async () => {
    (db.select as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    });

    const session = await getSession(makeRequest("session=unknown-token"));
    expect(session).toBeNull();
  });
});

describe("invalidateSession", () => {
  it("セッションを削除する", async () => {
    (db.delete as jest.Mock).mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined),
    });

    await expect(invalidateSession("session-token")).resolves.not.toThrow();
    expect(db.delete).toHaveBeenCalled();
  });
});
