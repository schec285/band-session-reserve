import { validateCode } from "@/server/services/auth/verification";
import type { IVerificationRepository } from "@/server/repositories/auth/verification-repository";

const mockRepo: jest.Mocked<IVerificationRepository> = {
  save: jest.fn(),
  findBySessionId: jest.fn(),
  deleteBySessionId: jest.fn(),
};

const validRecord = {
  userId: "user-id",
  code: "483920",
  expiresAt: new Date(Date.now() + 60000),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRepo.findBySessionId.mockResolvedValue(validRecord);
});

describe("validateCode", () => {
  it("正しいコードは valid を返す", async () => {
    const result = await validateCode(mockRepo, "session-id", "483920");
    expect(result).toBe("valid");
  });

  it("コードが一致しない場合は invalid を返す", async () => {
    const result = await validateCode(mockRepo, "session-id", "000000");
    expect(result).toBe("invalid");
  });

  it("レコードが存在しない場合は invalid を返す", async () => {
    mockRepo.findBySessionId.mockResolvedValue(null);

    const result = await validateCode(mockRepo, "session-id", "483920");
    expect(result).toBe("invalid");
  });

  it("有効期限切れは expired を返す", async () => {
    mockRepo.findBySessionId.mockResolvedValue({
      ...validRecord,
      expiresAt: new Date(Date.now() - 1000),
    });

    const result = await validateCode(mockRepo, "session-id", "483920");
    expect(result).toBe("expired");
  });
});
