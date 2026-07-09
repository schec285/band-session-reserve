import type { Mocked } from "vitest";
import { getAllUsers, updateUserRole } from "@/server/services/admin/users";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";

const mockUserRecord = {
  id: "user-uuid-1",
  name: "山田 太郎",
  email: "yamada@example.com",
  role: "member",
  emailVerified: new Date("2026-01-01T00:00:00.000Z"),
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  lastAccessDate: "2026-03-01",
};

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
  };
});

// ---------------------------------------------------------------------------
// getAllUsers
// ---------------------------------------------------------------------------

describe("getAllUsers", () => {
  it("ok: 全ユーザー一覧を返す", async () => {
    mockRepo.findAll.mockResolvedValue([mockUserRecord]);

    const result = await getAllUsers(mockRepo);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "user-uuid-1",
      name: "山田 太郎",
      email: "yamada@example.com",
      role: "member",
      isVerified: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      lastAccessDate: "2026-03-01",
    });
  });

  it("ユーザーが0件の場合は空配列を返す", async () => {
    mockRepo.findAll.mockResolvedValue([]);

    const result = await getAllUsers(mockRepo);

    expect(result).toEqual([]);
  });

  it("emailVerified が null のユーザーは isVerified: false を返す", async () => {
    mockRepo.findAll.mockResolvedValue([{ ...mockUserRecord, emailVerified: null }]);

    const result = await getAllUsers(mockRepo);

    expect(result[0].isVerified).toBe(false);
  });

  it("lastAccessDate が null（未アクセス）のユーザーは null を返す", async () => {
    mockRepo.findAll.mockResolvedValue([{ ...mockUserRecord, lastAccessDate: null }]);

    const result = await getAllUsers(mockRepo);

    expect(result[0].lastAccessDate).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateUserRole
// ---------------------------------------------------------------------------

describe("updateUserRole", () => {
  it("ok: ロールを更新したユーザーを返す", async () => {
    mockRepo.updateRole.mockResolvedValue({ ...mockUserRecord, role: "admin" });

    const result = await updateUserRole(mockRepo, "admin-uuid", "user-uuid-1", "admin");

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.user.role).toBe("admin");
    expect(mockRepo.updateRole).toHaveBeenCalledWith("user-uuid-1", "admin");
  });

  it("not-found: 対象ユーザーが存在しない場合", async () => {
    mockRepo.updateRole.mockResolvedValue(null);

    const result = await updateUserRole(mockRepo, "admin-uuid", "nonexistent-uuid", "admin");

    expect(result.status).toBe("not-found");
  });

  it("self-role-change-forbidden: 自分自身のロールは変更できない", async () => {
    const result = await updateUserRole(mockRepo, "admin-uuid", "admin-uuid", "member");

    expect(result.status).toBe("self-role-change-forbidden");
    expect(mockRepo.updateRole).not.toHaveBeenCalled();
  });
});
