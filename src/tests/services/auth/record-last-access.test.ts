import type { Mocked } from "vitest";
import { recordLastAccess } from "@/server/services/auth/record-last-access";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";

const mockUserRepo = (): Mocked<IUserRepository> => ({
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
});

// UTC 2026-04-12T06:00:00Z = JST 2026-04-12
const NOW = new Date("2026-04-12T06:00:00.000Z");

describe("recordLastAccess", () => {
  it("Cookieが未設定の場合はDBを更新し、今日の日付を返す", async () => {
    const userRepo = mockUserRepo();

    const result = await recordLastAccess(userRepo, "user-id-1", undefined, NOW);

    expect(userRepo.updateLastAccessDate).toHaveBeenCalledWith("user-id-1", "2026-04-12");
    expect(result).toEqual({ cookieValue: "2026-04-12" });
  });

  it("Cookieの日付が今日と同じ場合はDBを更新しない", async () => {
    const userRepo = mockUserRepo();

    const result = await recordLastAccess(userRepo, "user-id-1", "2026-04-12", NOW);

    expect(userRepo.updateLastAccessDate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("Cookieの日付が前日の場合はDBを更新し、今日の日付を返す", async () => {
    const userRepo = mockUserRepo();

    const result = await recordLastAccess(userRepo, "user-id-1", "2026-04-11", NOW);

    expect(userRepo.updateLastAccessDate).toHaveBeenCalledWith("user-id-1", "2026-04-12");
    expect(result).toEqual({ cookieValue: "2026-04-12" });
  });
});
