import crypto from "crypto";
import type { Mocked } from "vitest";
import { verifyEmail } from "@/server/services/auth/verify-email";
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
  findAll: vi.fn(),
  updateRole: vi.fn(),
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
  sendPasswordChangedEmail: vi.fn(),
});

const USER_ID = "user-id-123";
const TOKEN_ID = "token-id-1";
const CODE = "123456";
const CODE_HASH = crypto.createHash("sha256").update(CODE).digest("hex");
const EMAIL = "test@example.com";
const EMAIL_HASH = crypto.createHash("sha256").update(EMAIL).digest("hex");

const makeToken = (overrides: Partial<{
  codeHash: string | null;
  attempts: number;
  expiresAt: Date;
}> = {}) => ({
  id: TOKEN_ID,
  userId: USER_ID,
  codeHash: overrides.codeHash !== undefined ? overrides.codeHash : CODE_HASH,
  attempts: overrides.attempts ?? 0,
  expiresAt: overrides.expiresAt ?? new Date(Date.now() + 10 * 60 * 1000),
});

describe("verifyEmail", () => {
  describe("正常系", () => {
    it("有効なコードで認証成功 → emailVerified セット・トークン削除・ウェルカムメール送信・ok", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();

      tokenRepo.findById.mockResolvedValue(makeToken());
      userRepo.findById.mockResolvedValue({ id: USER_ID, email: EMAIL, name: "テスト" });
      userRepo.setEmailVerified.mockResolvedValue();
      tokenRepo.deleteById.mockResolvedValue();
      emailService.sendWelcomeEmail.mockResolvedValue({ status: "ok" });

      const result = await verifyEmail(userRepo, tokenRepo, emailService, {
        tokenId: TOKEN_ID,
        emailHash: EMAIL_HASH,
        code: CODE,
      });

      expect(result.status).toBe("ok");
      expect(userRepo.setEmailVerified).toHaveBeenCalledWith(USER_ID);
      expect(tokenRepo.deleteById).toHaveBeenCalledWith(TOKEN_ID);
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith({ to: EMAIL, name: "テスト" });
    });
  });

  describe("異常系", () => {
    it("トークンが存在しない場合 error: invalid を返す", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();
      tokenRepo.findById.mockResolvedValue(null);

      const result = await verifyEmail(userRepo, tokenRepo, emailService, {
        tokenId: TOKEN_ID,
        emailHash: EMAIL_HASH,
        code: CODE,
      });

      expect(result).toEqual({ status: "error", reason: "invalid" });
    });

    it("emailHash が不一致の場合 error: invalid を返す", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();
      tokenRepo.findById.mockResolvedValue(makeToken());
      userRepo.findById.mockResolvedValue({ id: USER_ID, email: "other@example.com", name: "他" });

      const result = await verifyEmail(userRepo, tokenRepo, emailService, {
        tokenId: TOKEN_ID,
        emailHash: EMAIL_HASH,
        code: CODE,
      });

      expect(result).toEqual({ status: "error", reason: "invalid" });
      expect(userRepo.setEmailVerified).not.toHaveBeenCalled();
    });

    it("トークンが期限切れの場合 トークン削除して error: expired を返す", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();
      tokenRepo.findById.mockResolvedValue(makeToken({ expiresAt: new Date(Date.now() - 1000) }));
      userRepo.findById.mockResolvedValue({ id: USER_ID, email: EMAIL, name: "テスト" });
      tokenRepo.deleteById.mockResolvedValue();

      const result = await verifyEmail(userRepo, tokenRepo, emailService, {
        tokenId: TOKEN_ID,
        emailHash: EMAIL_HASH,
        code: CODE,
      });

      expect(result).toEqual({ status: "error", reason: "expired" });
      expect(tokenRepo.deleteById).toHaveBeenCalledWith(TOKEN_ID);
    });

    it("codeHash が null（認証済み既存ユーザー）の場合 error: invalid を返す", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();
      tokenRepo.findById.mockResolvedValue(makeToken({ codeHash: null }));
      userRepo.findById.mockResolvedValue({ id: USER_ID, email: EMAIL, name: "テスト" });
      tokenRepo.incrementAttempts.mockResolvedValue();

      const result = await verifyEmail(userRepo, tokenRepo, emailService, {
        tokenId: TOKEN_ID,
        emailHash: EMAIL_HASH,
        code: CODE,
      });

      expect(result).toEqual({ status: "error", reason: "invalid" });
    });

    it("コードが不一致の場合 incrementAttempts を呼び error: invalid を返す", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();
      tokenRepo.findById.mockResolvedValue(makeToken({ attempts: 2 }));
      userRepo.findById.mockResolvedValue({ id: USER_ID, email: EMAIL, name: "テスト" });
      tokenRepo.incrementAttempts.mockResolvedValue();

      const result = await verifyEmail(userRepo, tokenRepo, emailService, {
        tokenId: TOKEN_ID,
        emailHash: EMAIL_HASH,
        code: "999999",
      });

      expect(result).toEqual({ status: "error", reason: "invalid" });
      expect(tokenRepo.incrementAttempts).toHaveBeenCalledWith(TOKEN_ID);
      expect(tokenRepo.deleteById).not.toHaveBeenCalled();
    });

    it("5回目の失敗でトークン削除して error: restart を返す", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();
      tokenRepo.findById.mockResolvedValue(makeToken({ attempts: 4 }));
      userRepo.findById.mockResolvedValue({ id: USER_ID, email: EMAIL, name: "テスト" });
      tokenRepo.deleteById.mockResolvedValue();

      const result = await verifyEmail(userRepo, tokenRepo, emailService, {
        tokenId: TOKEN_ID,
        emailHash: EMAIL_HASH,
        code: "999999",
      });

      expect(result).toEqual({ status: "error", reason: "restart" });
      expect(tokenRepo.deleteById).toHaveBeenCalledWith(TOKEN_ID);
      expect(tokenRepo.incrementAttempts).not.toHaveBeenCalled();
    });
  });
});
