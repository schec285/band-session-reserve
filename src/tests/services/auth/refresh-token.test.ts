import type { Mocked } from "vitest";
import { refreshTokenData } from "@/server/services/auth/refresh-token";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";

let mockRepo: Mocked<IUserRepository>;

beforeEach(() => {
  mockRepo = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    findByEmailForAuth: vi.fn(),
    findByIdForAuth: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setEmailVerified: vi.fn(),
    updateLastAccessDate: vi.fn(),
    updatePassword: vi.fn(),
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    findAll: vi.fn(),
    updateRole: vi.fn(),
    getAuthRefreshData: vi.fn(),
  };
});

describe("refreshTokenData", () => {
  it("ユーザーが存在する場合、名前とロールを返す", async () => {
    mockRepo.getAuthRefreshData.mockResolvedValue({
      name: "山田 太郎",
      role: "admin",
    });

    const result = await refreshTokenData(mockRepo, "user-uuid");

    expect(result).toEqual({ name: "山田 太郎", role: "admin" });
  });

  it("ユーザーが存在しない場合、null を返す", async () => {
    mockRepo.getAuthRefreshData.mockResolvedValue(null);

    const result = await refreshTokenData(mockRepo, "non-existent-uuid");

    expect(result).toBeNull();
  });

  it("getAuthRefreshData に userId が渡される", async () => {
    mockRepo.getAuthRefreshData.mockResolvedValue(null);

    await refreshTokenData(mockRepo, "target-uuid");

    expect(mockRepo.getAuthRefreshData).toHaveBeenCalledWith("target-uuid");
  });
});
