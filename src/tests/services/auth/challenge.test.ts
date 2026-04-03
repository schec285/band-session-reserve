import { generateChallenge, validateChallenge } from "@/server/services/auth/challenge";
import type { IChallengeRepository } from "@/server/repositories/auth/challenge-repository";

const mockRepo: jest.Mocked<IChallengeRepository> = {
  save: jest.fn(),
  findBySessionId: jest.fn(),
  deleteBySessionId: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRepo.save.mockResolvedValue(undefined);
  mockRepo.deleteBySessionId.mockResolvedValue(undefined);
});

describe("generateChallenge", () => {
  it("文字列を返す", async () => {
    const challenge = await generateChallenge(mockRepo, "session-id", "verify-email");
    expect(typeof challenge).toBe("string");
    expect(challenge.length).toBeGreaterThan(0);
  });

  it("呼び出すたびに異なる値を返す", async () => {
    const challenge1 = await generateChallenge(mockRepo, "session-id-1", "verify-email");
    const challenge2 = await generateChallenge(mockRepo, "session-id-2", "verify-email");
    expect(challenge1).not.toBe(challenge2);
  });
});

describe("validateChallenge", () => {
  it("有効なチャレンジは true を返し、削除する", async () => {
    mockRepo.findBySessionId.mockResolvedValue({ id: "valid-nonce", type: "verify-email" });

    expect(await validateChallenge(mockRepo, "session-id", "valid-nonce")).toBe(true);
    expect(mockRepo.deleteBySessionId).toHaveBeenCalledWith("session-id");
  });

  it("セッションに紐づくチャレンジが存在しない場合は false を返す", async () => {
    mockRepo.findBySessionId.mockResolvedValue(null);

    expect(await validateChallenge(mockRepo, "session-id", "valid-nonce")).toBe(false);
  });

  it("nonce が一致しない場合は false を返す", async () => {
    mockRepo.findBySessionId.mockResolvedValue({ id: "other-nonce", type: "verify-email" });

    expect(await validateChallenge(mockRepo, "session-id", "wrong-nonce")).toBe(false);
  });
});
