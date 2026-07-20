import type { Mocked } from "vitest";
import { signUp } from "@/server/services/auth/signup";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import type { IVerificationTokenRepository } from "@/server/repositories/auth/verification-token-repository";
import type { IEmailService } from "@/server/services/email/auth/email-service";

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
  getAuthRefreshData: vi.fn(),
});

const mockTokenRepo = (): Mocked<IVerificationTokenRepository> => ({
  findById: vi.fn(),
  findByUserId: vi.fn(),
  create: vi.fn(),
  incrementAttempts: vi.fn(),
  deleteByUserId: vi.fn(),
  deleteById: vi.fn(),
});

const mockEmailService = (): Mocked<IEmailService> => ({
  sendVerificationEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
});

describe("signUp", () => {
  describe("正常系", () => {
    it("新規ユーザーを作成してトークンを保存し認証メールを送信して tokenId を返す", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();
      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.create.mockResolvedValue({ id: "new-user-id" });
      tokenRepo.deleteByUserId.mockResolvedValue();
      tokenRepo.create.mockResolvedValue({ id: "token-id-1" });
      emailService.sendVerificationEmail.mockResolvedValue({ status: "ok" });

      const result = await signUp(userRepo, tokenRepo, emailService, {
        email: "test@example.com",
        password: "password123",
        name: "テストユーザー",
      });

      expect(result.status).toBe("ok");
      expect(result.tokenId).toBe("token-id-1");

      // ユーザー作成
      expect(userRepo.create).toHaveBeenCalledTimes(1);
      const createArg = userRepo.create.mock.calls[0][0];
      expect(createArg.email).toBe("test@example.com");
      expect(createArg.passwordHash).not.toBe("password123");
      expect(createArg.passwordHash).toMatch(/^\$argon2id\$/);

      // 既存トークン削除 → 新規トークン保存（codeHash あり）
      expect(tokenRepo.deleteByUserId).toHaveBeenCalledWith("new-user-id");
      expect(tokenRepo.create).toHaveBeenCalledTimes(1);
      const tokenArg = tokenRepo.create.mock.calls[0][0];
      expect(tokenArg.userId).toBe("new-user-id");
      expect(tokenArg.codeHash).toBeTruthy();
      expect(tokenArg.expiresAt).toBeInstanceOf(Date);

      // 認証メール送信（コードは6桁）
      expect(emailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      const emailArg = emailService.sendVerificationEmail.mock.calls[0][0];
      expect(emailArg.to).toBe("test@example.com");
      expect(emailArg.code).toMatch(/^\d{6}$/);

      expect(emailService.sendWelcomeEmail).not.toHaveBeenCalled();
    });

    it("未認証の既存ユーザーは名前とパスワードを更新してコードを生成して tokenId を返す", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();
      userRepo.findByEmail.mockResolvedValue({ id: "existing-user-id", name: "テストユーザー", emailVerified: null });
      userRepo.update.mockResolvedValue();
      tokenRepo.deleteByUserId.mockResolvedValue();
      tokenRepo.create.mockResolvedValue({ id: "token-id-2" });
      emailService.sendVerificationEmail.mockResolvedValue({ status: "ok" });

      const result = await signUp(userRepo, tokenRepo, emailService, {
        email: "test@example.com",
        password: "password123",
        name: "テストユーザー",
      });

      expect(result.status).toBe("ok");
      expect(result.tokenId).toBe("token-id-2");
      expect(userRepo.create).not.toHaveBeenCalled();
      expect(userRepo.update).toHaveBeenCalledTimes(1);
      const updateArg = userRepo.update.mock.calls[0];
      expect(updateArg[0]).toBe("existing-user-id");
      expect(updateArg[1].passwordHash).not.toBe("password123");
      expect(updateArg[1].passwordHash).toMatch(/^\$argon2id\$/);
      expect(updateArg[1].name).toBe("テストユーザー");
      expect(tokenRepo.create.mock.calls[0][0].codeHash).toBeTruthy();
      expect(emailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
    });

    it("認証済みの既存ユーザーは codeHash null でトークン作成しメール送信しない", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();
      userRepo.findByEmail.mockResolvedValue({ id: "existing-user-id", name: "テストユーザー", emailVerified: new Date() });
      tokenRepo.deleteByUserId.mockResolvedValue();
      tokenRepo.create.mockResolvedValue({ id: "token-id-3" });

      const result = await signUp(userRepo, tokenRepo, emailService, {
        email: "test@example.com",
        password: "password123",
        name: "テストユーザー",
      });

      expect(result.status).toBe("ok");
      expect(result.tokenId).toBe("token-id-3");
      expect(userRepo.create).not.toHaveBeenCalled();
      expect(tokenRepo.create.mock.calls[0][0].codeHash).toBeNull();
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });
});
