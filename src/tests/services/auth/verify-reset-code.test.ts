import crypto from "crypto";
import type { Mocked } from "vitest";
import { verifyResetCode } from "@/server/services/auth/verify-reset-code";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import type { IVerificationTokenRepository } from "@/server/repositories/auth/verification-token-repository";

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

const EMAIL = "test@example.com";
const EMAIL_HASH = crypto.createHash("sha256").update(EMAIL).digest("hex");
const CODE = "123456";
const CODE_HASH = crypto.createHash("sha256").update(CODE).digest("hex");
const FUTURE = new Date(Date.now() + 10 * 60 * 1000);

describe("verifyResetCode", () => {
  describe("正常系", () => {
    it("有効なコードで検証成功 → 旧トークン削除・codeHash=null 新トークン作成・新 tokenId を返す", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      userRepo.findById.mockResolvedValue({ id: "user-id-1", email: EMAIL, name: "テスト" });
      tokenRepo.findById.mockResolvedValue({ id: "token-id-1", userId: "user-id-1", codeHash: CODE_HASH, attempts: 0, expiresAt: FUTURE });
      tokenRepo.deleteById.mockResolvedValue();
      tokenRepo.create.mockResolvedValue({ id: "new-token-id" });

      const result = await verifyResetCode(userRepo, tokenRepo, { tokenId: "token-id-1", emailHash: EMAIL_HASH, code: CODE });

      expect(result.status).toBe("ok");
      if (result.status === "ok") {
        expect(result.tokenId).toBe("new-token-id");
      }
      expect(tokenRepo.deleteById).toHaveBeenCalledWith("token-id-1");
      expect(tokenRepo.create).toHaveBeenCalledTimes(1);
      expect(tokenRepo.create.mock.calls[0][0].codeHash).toBeNull();
      expect(tokenRepo.create.mock.calls[0][0].userId).toBe("user-id-1");
    });
  });

  describe("異常系", () => {
    it("tokenId が存在しない（fake tokenId）場合: error: invalid を返す", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      tokenRepo.findById.mockResolvedValue(null);

      const result = await verifyResetCode(userRepo, tokenRepo, { tokenId: "fake-id", emailHash: EMAIL_HASH, code: CODE });

      expect(result).toEqual({ status: "error", reason: "invalid" });
      expect(tokenRepo.deleteById).not.toHaveBeenCalled();
    });

    it("emailHash が不一致の場合: error: invalid を返す", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      tokenRepo.findById.mockResolvedValue({ id: "token-id-1", userId: "user-id-1", codeHash: CODE_HASH, attempts: 0, expiresAt: FUTURE });
      userRepo.findById.mockResolvedValue({ id: "user-id-1", email: "other@example.com", name: "他ユーザー" });

      const result = await verifyResetCode(userRepo, tokenRepo, { tokenId: "token-id-1", emailHash: EMAIL_HASH, code: CODE });

      expect(result).toEqual({ status: "error", reason: "invalid" });
    });

    it("トークンが期限切れの場合: トークン削除して error: expired を返す", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      tokenRepo.findById.mockResolvedValue({ id: "token-id-1", userId: "user-id-1", codeHash: CODE_HASH, attempts: 0, expiresAt: new Date(Date.now() - 1000) });
      userRepo.findById.mockResolvedValue({ id: "user-id-1", email: EMAIL, name: "テスト" });
      tokenRepo.deleteById.mockResolvedValue();

      const result = await verifyResetCode(userRepo, tokenRepo, { tokenId: "token-id-1", emailHash: EMAIL_HASH, code: CODE });

      expect(result).toEqual({ status: "error", reason: "expired" });
      expect(tokenRepo.deleteById).toHaveBeenCalledWith("token-id-1");
    });

    it("codeHash が null（無効ユーザー）の場合: incrementAttempts を呼び error: invalid を返す", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      tokenRepo.findById.mockResolvedValue({ id: "token-id-1", userId: "user-id-1", codeHash: null, attempts: 0, expiresAt: FUTURE });
      userRepo.findById.mockResolvedValue({ id: "user-id-1", email: EMAIL, name: "テスト" });
      tokenRepo.incrementAttempts.mockResolvedValue();

      const result = await verifyResetCode(userRepo, tokenRepo, { tokenId: "token-id-1", emailHash: EMAIL_HASH, code: CODE });

      expect(result).toEqual({ status: "error", reason: "invalid" });
      expect(tokenRepo.incrementAttempts).toHaveBeenCalledWith("token-id-1");
    });

    it("コードが不一致の場合: incrementAttempts を呼び error: invalid を返す", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      tokenRepo.findById.mockResolvedValue({ id: "token-id-1", userId: "user-id-1", codeHash: CODE_HASH, attempts: 0, expiresAt: FUTURE });
      userRepo.findById.mockResolvedValue({ id: "user-id-1", email: EMAIL, name: "テスト" });
      tokenRepo.incrementAttempts.mockResolvedValue();

      const result = await verifyResetCode(userRepo, tokenRepo, { tokenId: "token-id-1", emailHash: EMAIL_HASH, code: "000000" });

      expect(result).toEqual({ status: "error", reason: "invalid" });
      expect(tokenRepo.incrementAttempts).toHaveBeenCalledWith("token-id-1");
    });

    it("5回目の失敗でトークン削除して error: restart を返す", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      tokenRepo.findById.mockResolvedValue({ id: "token-id-1", userId: "user-id-1", codeHash: CODE_HASH, attempts: 4, expiresAt: FUTURE });
      userRepo.findById.mockResolvedValue({ id: "user-id-1", email: EMAIL, name: "テスト" });
      tokenRepo.deleteById.mockResolvedValue();

      const result = await verifyResetCode(userRepo, tokenRepo, { tokenId: "token-id-1", emailHash: EMAIL_HASH, code: "000000" });

      expect(result).toEqual({ status: "error", reason: "restart" });
      expect(tokenRepo.deleteById).toHaveBeenCalledWith("token-id-1");
    });
  });
});
