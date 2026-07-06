import crypto from "crypto";
import type { Mocked } from "vitest";
import { resendVerification } from "@/server/services/auth/resend-verification";
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
  updateLastLogin: vi.fn(),
  updatePassword: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
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

function makeToken(overrides?: Partial<{
  id: string;
  userId: string;
  codeHash: string | null;
  attempts: number;
  expiresAt: Date;
}>) {
  return {
    id: TOKEN_ID,
    userId: USER_ID,
    codeHash: CODE_HASH,
    attempts: 0,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    ...overrides,
  };
}

describe("resendVerification", () => {
  describe("正常系", () => {
    it("有効なトークン・codeHash あり → 旧トークン削除・新コード生成・認証メール送信・新 tokenId を返す", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();

      tokenRepo.findById.mockResolvedValue(makeToken());
      userRepo.findById.mockResolvedValue({ id: USER_ID, email: EMAIL, name: "テスト" });
      tokenRepo.deleteById.mockResolvedValue();
      tokenRepo.create.mockResolvedValue({ id: "new-token-id" });
      emailService.sendVerificationEmail.mockResolvedValue({ status: "ok" });

      const result = await resendVerification(userRepo, tokenRepo, emailService, {
        tokenId: TOKEN_ID,
        emailHash: EMAIL_HASH,
      });

      expect(result.status).toBe("ok");
      if (result.status !== "ok") return;
      expect(result.tokenId).toBe("new-token-id");

      // 旧トークン削除
      expect(tokenRepo.deleteById).toHaveBeenCalledWith(TOKEN_ID);

      // 新トークン作成（codeHash あり）
      expect(tokenRepo.create).toHaveBeenCalledTimes(1);
      const createArg = tokenRepo.create.mock.calls[0][0];
      expect(createArg.userId).toBe(USER_ID);
      expect(createArg.codeHash).toBeTruthy();
      expect(createArg.expiresAt).toBeInstanceOf(Date);

      // 認証メール送信（コードは6桁）
      expect(emailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      const emailArg = emailService.sendVerificationEmail.mock.calls[0][0];
      expect(emailArg.to).toBe(EMAIL);
      expect(emailArg.code).toMatch(/^\d{6}$/);
    });

    it("codeHash null（認証済み既存ユーザー）→ メール送信なし・codeHash null で新トークン作成", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();

      tokenRepo.findById.mockResolvedValue(makeToken({ codeHash: null }));
      userRepo.findById.mockResolvedValue({ id: USER_ID, email: EMAIL, name: "テスト" });
      tokenRepo.deleteById.mockResolvedValue();
      tokenRepo.create.mockResolvedValue({ id: "new-token-id-2" });

      const result = await resendVerification(userRepo, tokenRepo, emailService, {
        tokenId: TOKEN_ID,
        emailHash: EMAIL_HASH,
      });

      expect(result.status).toBe("ok");
      if (result.status !== "ok") return;
      expect(result.tokenId).toBe("new-token-id-2");

      expect(tokenRepo.create.mock.calls[0][0].codeHash).toBeNull();
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe("異常系", () => {
    it("トークンが存在しない → error: invalid", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();

      tokenRepo.findById.mockResolvedValue(null);

      const result = await resendVerification(userRepo, tokenRepo, emailService, {
        tokenId: TOKEN_ID,
        emailHash: EMAIL_HASH,
      });

      expect(result).toEqual({ status: "error", reason: "invalid" });
      expect(tokenRepo.create).not.toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("ユーザーが存在しない → error: invalid", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();

      tokenRepo.findById.mockResolvedValue(makeToken());
      userRepo.findById.mockResolvedValue(null);

      const result = await resendVerification(userRepo, tokenRepo, emailService, {
        tokenId: TOKEN_ID,
        emailHash: EMAIL_HASH,
      });

      expect(result).toEqual({ status: "error", reason: "invalid" });
    });

    it("emailHash が不一致 → error: invalid", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();

      tokenRepo.findById.mockResolvedValue(makeToken());
      userRepo.findById.mockResolvedValue({ id: USER_ID, email: "other@example.com", name: "テスト" });

      const result = await resendVerification(userRepo, tokenRepo, emailService, {
        tokenId: TOKEN_ID,
        emailHash: EMAIL_HASH,
      });

      expect(result).toEqual({ status: "error", reason: "invalid" });
      expect(tokenRepo.create).not.toHaveBeenCalled();
    });

    it("トークンが期限切れ → deleteById 呼び出し・新トークン未作成・error: expired", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      const emailService = mockEmailService();

      tokenRepo.findById.mockResolvedValue(makeToken({ expiresAt: new Date(Date.now() - 1000) }));
      userRepo.findById.mockResolvedValue({ id: USER_ID, email: EMAIL, name: "テスト" });
      tokenRepo.deleteById.mockResolvedValue();

      const result = await resendVerification(userRepo, tokenRepo, emailService, {
        tokenId: TOKEN_ID,
        emailHash: EMAIL_HASH,
      });

      expect(result).toEqual({ status: "error", reason: "expired" });
      expect(tokenRepo.deleteById).toHaveBeenCalledWith(TOKEN_ID);
      expect(tokenRepo.create).not.toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });
});
