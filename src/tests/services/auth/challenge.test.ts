import { generateChallenge, validateChallenge } from "@/server/services/auth/challenge";
import type { IChallengeRepository } from "@/lib/auth/repository/challenge-repository";

const mockRepo: jest.Mocked<IChallengeRepository> = {
  save: jest.fn(),
  findByChallenge: jest.fn(),
  markAsUsed: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRepo.save.mockResolvedValue(undefined);
  mockRepo.markAsUsed.mockResolvedValue(undefined);
});

describe("generateChallenge", () => {
  it("文字列を返す", async () => {
    const challenge = await generateChallenge(mockRepo);
    expect(typeof challenge).toBe("string");
    expect(challenge.length).toBeGreaterThan(0);
  });

  it("呼び出すたびに異なる値を返す", async () => {
    const challenge1 = await generateChallenge(mockRepo);
    const challenge2 = await generateChallenge(mockRepo);
    expect(challenge1).not.toBe(challenge2);
  });
});

describe("validateChallenge", () => {
  it("有効なチャレンジは true を返す", async () => {
    mockRepo.findByChallenge.mockResolvedValue({
      usedAt: null,
      expiresAt: new Date(Date.now() + 60000),
    });

    expect(await validateChallenge(mockRepo, "valid-challenge")).toBe(true);
  });

  it("存在しないチャレンジは false を返す", async () => {
    mockRepo.findByChallenge.mockResolvedValue(null);

    expect(await validateChallenge(mockRepo, "unknown-challenge")).toBe(false);
  });

  it("有効期限切れのチャレンジは false を返す", async () => {
    mockRepo.findByChallenge.mockResolvedValue({
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });

    expect(await validateChallenge(mockRepo, "expired-challenge")).toBe(false);
  });

  it("使用済みのチャレンジは false を返す", async () => {
    mockRepo.findByChallenge.mockResolvedValue({
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
    });

    expect(await validateChallenge(mockRepo, "used-challenge")).toBe(false);
  });
});
