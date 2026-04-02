import { createSession, getSession, invalidateSession } from "@/server/services/auth/session";
import type { ISessionRepository } from "@/server/repositories/auth/session-repository";

const mockRepo: jest.Mocked<ISessionRepository> = {
  save: jest.fn(),
  findByToken: jest.fn(),
  deleteByToken: jest.fn(),
};

function makeRequest(cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers["Cookie"] = cookie;
  return new Request("http://localhost/", { headers });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRepo.save.mockResolvedValue(undefined);
  mockRepo.deleteByToken.mockResolvedValue(undefined);
});

describe("createSession", () => {
  it("セッショントークンを返す", async () => {
    const token = await createSession(mockRepo, "user-id");
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });
});

describe("getSession", () => {
  it("有効なセッションクッキーは userId を返す", async () => {
    mockRepo.findByToken.mockResolvedValue({ userId: "user-id" });

    const session = await getSession(mockRepo, makeRequest("session=valid-token"));
    expect(session).toEqual({ userId: "user-id" });
  });

  it("セッションクッキーがない場合は null を返す", async () => {
    const session = await getSession(mockRepo, makeRequest());
    expect(session).toBeNull();
  });

  it("存在しないセッションは null を返す", async () => {
    mockRepo.findByToken.mockResolvedValue(null);

    const session = await getSession(mockRepo, makeRequest("session=unknown-token"));
    expect(session).toBeNull();
  });
});

describe("invalidateSession", () => {
  it("セッションを削除する", async () => {
    await expect(invalidateSession(mockRepo, "session-token")).resolves.not.toThrow();
    expect(mockRepo.deleteByToken).toHaveBeenCalledWith("session-token");
  });
});
