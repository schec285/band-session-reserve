import type { Mocked } from "vitest";
import { getProfile, updateProfile } from "@/server/services/user/profile";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";

let mockRepo: Mocked<IUserRepository>;

beforeEach(() => {
  mockRepo = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    findByEmailForAuth: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setEmailVerified: vi.fn(),
    updatePassword: vi.fn(),
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  };
});

describe("getProfile", () => {
  it("プロフィールが存在する場合、GetProfileResponse を返す", async () => {
    mockRepo.getProfile.mockResolvedValue({
      email: "user@example.com",
      name: "山田 太郎",
      part: "vocal",
      comment: "よろしくお願いします",
    });

    const result = await getProfile(mockRepo, "user-uuid");

    expect(result).toEqual({
      email: "user@example.com",
      name: "山田 太郎",
      part: "vocal",
      comment: "よろしくお願いします",
    });
  });

  it("part・comment が null の場合、そのまま返す", async () => {
    mockRepo.getProfile.mockResolvedValue({
      email: "user@example.com",
      name: "山田 太郎",
      part: null,
      comment: null,
    });

    const result = await getProfile(mockRepo, "user-uuid");

    expect(result).toEqual({
      email: "user@example.com",
      name: "山田 太郎",
      part: null,
      comment: null,
    });
  });

  it("ユーザーが存在しない場合、null を返す", async () => {
    mockRepo.getProfile.mockResolvedValue(null);

    const result = await getProfile(mockRepo, "non-existent-uuid");

    expect(result).toBeNull();
  });

  it("getProfile に userId が渡される", async () => {
    mockRepo.getProfile.mockResolvedValue(null);

    await getProfile(mockRepo, "target-uuid");

    expect(mockRepo.getProfile).toHaveBeenCalledWith("target-uuid");
  });
});

describe("updateProfile", () => {
  it("入力値がそのままリポジトリに渡される", async () => {
    mockRepo.updateProfile.mockResolvedValue(undefined);

    await updateProfile(mockRepo, "user-uuid", {
      name: "鈴木 花子",
      part: "bass",
      comment: "ベース担当です",
    });

    expect(mockRepo.updateProfile).toHaveBeenCalledWith("user-uuid", {
      name: "鈴木 花子",
      part: "bass",
      comment: "ベース担当です",
    });
  });

  it("part・comment が null でも呼び出せる", async () => {
    mockRepo.updateProfile.mockResolvedValue(undefined);

    await updateProfile(mockRepo, "user-uuid", {
      name: "鈴木 花子",
      part: null,
      comment: null,
    });

    expect(mockRepo.updateProfile).toHaveBeenCalledWith("user-uuid", {
      name: "鈴木 花子",
      part: null,
      comment: null,
    });
  });
});
