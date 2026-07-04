import type { Mocked } from "vitest";
import { login } from "@/server/services/auth/login";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import { hashPassword } from "@/server/services/auth/password-hash";

const mockUserRepo = (): Mocked<IUserRepository> => ({
  findByEmail: vi.fn(),
  findById: vi.fn(),
  findByEmailForAuth: vi.fn(),
  findByIdForAuth: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setEmailVerified: vi.fn(),
  updateLastLogin: vi.fn(),
  updatePassword: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  findAll: vi.fn(),
  updateRole: vi.fn(),
});

const VALID_PASSWORD = "password123";

const makeUser = (overrides: Partial<{
  passwordHash: string | null;
  emailVerified: Date | null;
}> = {}) => ({
  id: "user-id-1",
  email: "test@example.com",
  name: "テスト",
  image: null,
  role: "member",
  passwordHash: overrides.passwordHash !== undefined
    ? overrides.passwordHash
    : "$2a$10$hashedpassword",
  emailVerified: overrides.emailVerified !== undefined
    ? overrides.emailVerified
    : new Date(),
});

describe("login", () => {
  describe("正常系", () => {
    it("bcryptハッシュ（移行期の既存ユーザー）でも有効な認証情報でユーザー情報を返し、Argon2idへ遅延リハッシュする", async () => {
      const userRepo = mockUserRepo();

      // bcrypt hash of "password123"（移行期の既存ユーザーを想定）
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash(VALID_PASSWORD, 10);
      userRepo.findByEmailForAuth.mockResolvedValue(makeUser({ passwordHash: hash }));

      const result = await login(userRepo, { email: "test@example.com", password: VALID_PASSWORD });

      expect(result).not.toBeNull();
      expect(result?.id).toBe("user-id-1");
      expect(result?.email).toBe("test@example.com");
      expect(userRepo.updateLastLogin).toHaveBeenCalledWith("user-id-1");
      expect(userRepo.updatePassword).toHaveBeenCalledTimes(1);
      const [rehashedId, rehashedHash] = userRepo.updatePassword.mock.calls[0];
      expect(rehashedId).toBe("user-id-1");
      expect(rehashedHash).toMatch(/^\$argon2id\$/);
    });

    it("Argon2idハッシュ済みユーザーは有効な認証情報でユーザー情報を返し、リハッシュは行われない", async () => {
      const userRepo = mockUserRepo();
      const hash = await hashPassword(VALID_PASSWORD);
      userRepo.findByEmailForAuth.mockResolvedValue(makeUser({ passwordHash: hash }));

      const result = await login(userRepo, { email: "test@example.com", password: VALID_PASSWORD });

      expect(result).not.toBeNull();
      expect(result?.id).toBe("user-id-1");
      expect(userRepo.updateLastLogin).toHaveBeenCalledWith("user-id-1");
      expect(userRepo.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe("異常系", () => {
    it("ユーザーが存在しない場合 null を返す", async () => {
      const userRepo = mockUserRepo();
      userRepo.findByEmailForAuth.mockResolvedValue(null);

      const result = await login(userRepo, { email: "nouser@example.com", password: VALID_PASSWORD });

      expect(result).toBeNull();
      expect(userRepo.updateLastLogin).not.toHaveBeenCalled();
    });

    it("passwordHash が null（OAuthユーザー）の場合 null を返す", async () => {
      const userRepo = mockUserRepo();
      userRepo.findByEmailForAuth.mockResolvedValue(makeUser({ passwordHash: null }));

      const result = await login(userRepo, { email: "test@example.com", password: VALID_PASSWORD });

      expect(result).toBeNull();
      expect(userRepo.updateLastLogin).not.toHaveBeenCalled();
    });

    it("パスワードが不一致の場合 null を返す", async () => {
      const userRepo = mockUserRepo();
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash(VALID_PASSWORD, 10);
      userRepo.findByEmailForAuth.mockResolvedValue(makeUser({ passwordHash: hash }));

      const result = await login(userRepo, { email: "test@example.com", password: "wrongpassword" });

      expect(result).toBeNull();
      expect(userRepo.updateLastLogin).not.toHaveBeenCalled();
      expect(userRepo.updatePassword).not.toHaveBeenCalled();
    });

    it("emailVerified が null（未認証）の場合 null を返す", async () => {
      const userRepo = mockUserRepo();
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash(VALID_PASSWORD, 10);
      userRepo.findByEmailForAuth.mockResolvedValue(makeUser({ passwordHash: hash, emailVerified: null }));

      const result = await login(userRepo, { email: "test@example.com", password: VALID_PASSWORD });

      expect(result).toBeNull();
      expect(userRepo.updateLastLogin).not.toHaveBeenCalled();
    });
  });
});
