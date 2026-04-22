import type { Mocked } from "vitest";
import { requestPasswordReset } from "@/server/services/auth/reset-password-request";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import type { IVerificationTokenRepository } from "@/server/repositories/auth/verification-token-repository";
import type { IEmailService } from "@/server/services/email/auth/email-service";

const mockUserRepo = (): Mocked<IUserRepository> => ({
  findByEmail: vi.fn(),
  findById: vi.fn(),
  findByEmailForAuth: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setEmailVerified: vi.fn(),
  updatePassword: vi.fn(),
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
});

describe("requestPasswordReset", () => {
  describe("認証済みユーザー", () => {
    it("6桁コードを生成してトークンを保存しパスワードリセットメールを送信して tokenId を返す", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();
      userRepo.findByEmail.mockResolvedValue({ id: "user-id-1", name: "テスト", emailVerified: new Date() });
      tokenRepo.deleteByUserId.mockResolvedValue();
      tokenRepo.create.mockResolvedValue({ id: "token-id-1" });
      emailService.sendPasswordResetEmail.mockResolvedValue({ status: "ok" });

      const result = await requestPasswordReset(userRepo, tokenRepo, emailService, {
        email: "test@example.com",
      });

      expect(result.status).toBe("ok");
      expect(result.tokenId).toBeTruthy();

      expect(tokenRepo.deleteByUserId).toHaveBeenCalledWith("user-id-1");
      expect(tokenRepo.create).toHaveBeenCalledTimes(1);
      const tokenArg = tokenRepo.create.mock.calls[0][0];
      expect(tokenArg.userId).toBe("user-id-1");
      expect(tokenArg.codeHash).toBeTruthy();

      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      const emailArg = emailService.sendPasswordResetEmail.mock.calls[0][0];
      expect(emailArg.to).toBe("test@example.com");
      expect(emailArg.code).toMatch(/^\d{6}$/);

      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe("未認証ユーザー（emailVerified が null）", () => {
    it("codeHash=null でトークン作成・メール送信なし", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();
      userRepo.findByEmail.mockResolvedValue({ id: "user-id-2", name: "未認証", emailVerified: null });
      tokenRepo.deleteByUserId.mockResolvedValue();
      tokenRepo.create.mockResolvedValue({ id: "token-id-2" });

      const result = await requestPasswordReset(userRepo, tokenRepo, emailService, {
        email: "unverified@example.com",
      });

      expect(result.status).toBe("ok");
      expect(tokenRepo.create.mock.calls[0][0].codeHash).toBeNull();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe("ユーザーが存在しない", () => {
    it("fake tokenId を返すだけで DB 操作・メール送信なし", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();
      userRepo.findByEmail.mockResolvedValue(null);

      const result = await requestPasswordReset(userRepo, tokenRepo, emailService, {
        email: "notfound@example.com",
      });

      expect(result.status).toBe("ok");
      expect(result.tokenId).toBeTruthy();
      expect(tokenRepo.create).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });
});
