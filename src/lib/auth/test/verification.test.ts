import {
  validateVerificationCode,
  activateUser,
  validatePasswordResetCode,
  updatePassword,
} from "../verification";
import type { IVerificationRepository } from "../repository/verification-repository";

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
}));

const mockRepo: jest.Mocked<IVerificationRepository> = {
  findCode: jest.fn(),
  markCodeAsUsed: jest.fn(),
  activateUser: jest.fn(),
  updateUserPassword: jest.fn(),
};

const validRecord = {
  userId: "user-id",
  code: "483920",
  usedAt: null,
  expiresAt: new Date(Date.now() + 60000),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRepo.findCode.mockResolvedValue(validRecord);
  mockRepo.markCodeAsUsed.mockResolvedValue(undefined);
  mockRepo.activateUser.mockResolvedValue(undefined);
  mockRepo.updateUserPassword.mockResolvedValue(undefined);
});

describe("validateVerificationCode", () => {
  it("正しいコードは valid を返す", async () => {
    const result = await validateVerificationCode(mockRepo, "valid-challenge", "483920");
    expect(result).toBe("valid");
  });

  it("コードが一致しない場合は invalid を返す", async () => {
    const result = await validateVerificationCode(mockRepo, "valid-challenge", "000000");
    expect(result).toBe("invalid");
  });

  it("有効期限切れは expired を返す", async () => {
    mockRepo.findCode.mockResolvedValue({
      ...validRecord,
      expiresAt: new Date(Date.now() - 1000),
    });

    const result = await validateVerificationCode(mockRepo, "expired-challenge", "483920");
    expect(result).toBe("expired");
  });

  it("使用済みコードは invalid を返す", async () => {
    mockRepo.findCode.mockResolvedValue({
      ...validRecord,
      usedAt: new Date(),
    });

    const result = await validateVerificationCode(mockRepo, "used-challenge", "483920");
    expect(result).toBe("invalid");
  });
});

describe("activateUser", () => {
  it("ユーザーのメールアドレスを有効化する", async () => {
    await activateUser(mockRepo, "valid-challenge");
    expect(mockRepo.activateUser).toHaveBeenCalledWith("user-id");
  });
});

describe("validatePasswordResetCode", () => {
  it("正しいコードは valid を返す", async () => {
    const result = await validatePasswordResetCode(mockRepo, "valid-challenge", "483920");
    expect(result).toBe("valid");
  });

  it("コードが一致しない場合は invalid を返す", async () => {
    const result = await validatePasswordResetCode(mockRepo, "valid-challenge", "000000");
    expect(result).toBe("invalid");
  });

  it("有効期限切れは expired を返す", async () => {
    mockRepo.findCode.mockResolvedValue({
      ...validRecord,
      expiresAt: new Date(Date.now() - 1000),
    });

    const result = await validatePasswordResetCode(mockRepo, "expired-challenge", "483920");
    expect(result).toBe("expired");
  });
});

describe("updatePassword", () => {
  it("パスワードを更新する", async () => {
    await updatePassword(mockRepo, "valid-challenge", "newP@ssw0rd");
    expect(mockRepo.updateUserPassword).toHaveBeenCalledWith("user-id", "hashed-password");
  });
});
