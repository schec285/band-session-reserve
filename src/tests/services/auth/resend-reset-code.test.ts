import crypto from "crypto";
import type { Mocked } from "vitest";
import { resendResetCode } from "@/server/services/auth/resend-reset-code";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import type { IVerificationTokenRepository } from "@/server/repositories/auth/verification-token-repository";
import type { IEmailService } from "@/server/services/email/auth/email-service";

const USER_ID = "user-id-1";
const TOKEN_ID = "token-id-1";
const EMAIL = "test@example.com";
const EMAIL_HASH = crypto.createHash("sha256").update(EMAIL).digest("hex");
const CODE_HASH = crypto.createHash("sha256").update("123456").digest("hex");

const mockUserRepo = (): Mocked<IUserRepository> => ({
  findByEmail: vi.fn(),
  findById: vi.fn(),
  findByEmailForAuth: vi.fn(),
  findByIdForAuth: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setEmailVerified: vi.fn(),
  updatePassword: vi.fn(),
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
  sendPasswordResetEmail: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
});

function makeToken(overrides?: Partial<{ id: string; userId: string; codeHash: string | null; attempts: number; expiresAt: Date }>) {
  return { id: TOKEN_ID, userId: USER_ID, codeHash: CODE_HASH, attempts: 0, expiresAt: new Date(Date.now() + 10 * 60 * 1000), ...overrides };
}

describe("resendResetCode", () => {
  describe("正常系", () => {
    it("有効なトークン・codeHash あり → 旧トークン削除・新コード生成・パスワードリセットメール送信・新 tokenId を返す", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();

      tokenRepo.findById.mockResolvedValue(makeToken());
      userRepo.findById.mockResolvedValue({ id: USER_ID, email: EMAIL, name: "テスト" });
      tokenRepo.deleteById.mockResolvedValue();
      tokenRepo.create.mockResolvedValue({ id: "new-token-id" });
      emailService.sendPasswordResetEmail.mockResolvedValue({ status: "ok" });

      const result = await resendResetCode(userRepo, tokenRepo, emailService, { tokenId: TOKEN_ID, emailHash: EMAIL_HASH });

      expect(result.status).toBe("ok");
      if (result.status !== "ok") return;
      expect(result.tokenId).toBe("new-token-id");

      expect(tokenRepo.deleteById).toHaveBeenCalledWith(TOKEN_ID);
      expect(tokenRepo.create.mock.calls[0][0].codeHash).toBeTruthy();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      const emailArg = emailService.sendPasswordResetEmail.mock.calls[0][0];
      expect(emailArg.to).toBe(EMAIL);
      expect(emailArg.code).toMatch(/^\d{6}$/);
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe("異常系", () => {
    it("トークンが存在しない → error: invalid", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();
      tokenRepo.findById.mockResolvedValue(null);

      const result = await resendResetCode(userRepo, tokenRepo, emailService, { tokenId: TOKEN_ID, emailHash: EMAIL_HASH });

      expect(result).toEqual({ status: "error", reason: "invalid" });
    });

    it("emailHash が不一致 → error: invalid", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();
      tokenRepo.findById.mockResolvedValue(makeToken());
      userRepo.findById.mockResolvedValue({ id: USER_ID, email: "other@example.com", name: "他ユーザー" });

      const result = await resendResetCode(userRepo, tokenRepo, emailService, { tokenId: TOKEN_ID, emailHash: EMAIL_HASH });

      expect(result).toEqual({ status: "error", reason: "invalid" });
    });

    it("トークンが期限切れ → deleteById 呼び出し・error: expired", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();
      tokenRepo.findById.mockResolvedValue(makeToken({ expiresAt: new Date(Date.now() - 1000) }));
      userRepo.findById.mockResolvedValue({ id: USER_ID, email: EMAIL, name: "テスト" });
      tokenRepo.deleteById.mockResolvedValue();

      const result = await resendResetCode(userRepo, tokenRepo, emailService, { tokenId: TOKEN_ID, emailHash: EMAIL_HASH });

      expect(result).toEqual({ status: "error", reason: "expired" });
      expect(tokenRepo.deleteById).toHaveBeenCalledWith(TOKEN_ID);
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });
});
