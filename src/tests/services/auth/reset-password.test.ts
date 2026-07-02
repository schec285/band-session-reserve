import crypto from "crypto";
import type { Mocked } from "vitest";
import { resetPassword } from "@/server/services/auth/reset-password";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import type { IVerificationTokenRepository } from "@/server/repositories/auth/verification-token-repository";

const USER_ID = "user-id-1";
const TOKEN_ID = "token-id-1";
const EMAIL = "test@example.com";
const EMAIL_HASH = crypto.createHash("sha256").update(EMAIL).digest("hex");
const FUTURE = new Date(Date.now() + 10 * 60 * 1000);

const mockUserRepo = (): Mocked<IUserRepository> => ({
  findByEmail: vi.fn(),
  findById: vi.fn(),
  findByEmailForAuth: vi.fn(),
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

describe("resetPassword", () => {
  describe("正常系", () => {
    it("有効なトークンと新パスワードでパスワードを更新してトークンを削除する", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      tokenRepo.findById.mockResolvedValue({ id: TOKEN_ID, userId: USER_ID, codeHash: null, attempts: 0, expiresAt: FUTURE });
      userRepo.findById.mockResolvedValue({ id: USER_ID, email: EMAIL, name: "テスト" });
      userRepo.updatePassword.mockResolvedValue();
      tokenRepo.deleteById.mockResolvedValue();

      const result = await resetPassword(userRepo, tokenRepo, { tokenId: TOKEN_ID, emailHash: EMAIL_HASH, newPassword: "newpassword123" });

      expect(result).toEqual({ status: "ok" });

      expect(userRepo.updatePassword).toHaveBeenCalledTimes(1);
      const [calledId, calledHash] = userRepo.updatePassword.mock.calls[0];
      expect(calledId).toBe(USER_ID);
      expect(calledHash).not.toBe("newpassword123"); // ハッシュ化されている
      expect(calledHash).toBeTruthy();

      expect(tokenRepo.deleteById).toHaveBeenCalledWith(TOKEN_ID);
    });
  });

  describe("異常系", () => {
    it("トークンが存在しない場合: error: invalid", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      tokenRepo.findById.mockResolvedValue(null);

      const result = await resetPassword(userRepo, tokenRepo, { tokenId: TOKEN_ID, emailHash: EMAIL_HASH, newPassword: "newpassword123" });

      expect(result).toEqual({ status: "error", reason: "invalid" });
      expect(userRepo.updatePassword).not.toHaveBeenCalled();
    });

    it("codeHash が null でない（未検証トークン）の場合: error: invalid", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      tokenRepo.findById.mockResolvedValue({ id: TOKEN_ID, userId: USER_ID, codeHash: "somehash", attempts: 0, expiresAt: FUTURE });
      userRepo.findById.mockResolvedValue({ id: USER_ID, email: EMAIL, name: "テスト" });

      const result = await resetPassword(userRepo, tokenRepo, { tokenId: TOKEN_ID, emailHash: EMAIL_HASH, newPassword: "newpassword123" });

      expect(result).toEqual({ status: "error", reason: "invalid" });
      expect(userRepo.updatePassword).not.toHaveBeenCalled();
    });

    it("emailHash が不一致の場合: error: invalid", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      tokenRepo.findById.mockResolvedValue({ id: TOKEN_ID, userId: USER_ID, codeHash: null, attempts: 0, expiresAt: FUTURE });
      userRepo.findById.mockResolvedValue({ id: USER_ID, email: "other@example.com", name: "他ユーザー" });

      const result = await resetPassword(userRepo, tokenRepo, { tokenId: TOKEN_ID, emailHash: EMAIL_HASH, newPassword: "newpassword123" });

      expect(result).toEqual({ status: "error", reason: "invalid" });
      expect(userRepo.updatePassword).not.toHaveBeenCalled();
    });

    it("トークンが期限切れの場合: トークン削除して error: expired", async () => {
      const userRepo = mockUserRepo();
      const tokenRepo = mockTokenRepo();
      tokenRepo.findById.mockResolvedValue({ id: TOKEN_ID, userId: USER_ID, codeHash: null, attempts: 0, expiresAt: new Date(Date.now() - 1000) });
      userRepo.findById.mockResolvedValue({ id: USER_ID, email: EMAIL, name: "テスト" });
      tokenRepo.deleteById.mockResolvedValue();

      const result = await resetPassword(userRepo, tokenRepo, { tokenId: TOKEN_ID, emailHash: EMAIL_HASH, newPassword: "newpassword123" });

      expect(result).toEqual({ status: "error", reason: "expired" });
      expect(tokenRepo.deleteById).toHaveBeenCalledWith(TOKEN_ID);
      expect(userRepo.updatePassword).not.toHaveBeenCalled();
    });
  });
});
