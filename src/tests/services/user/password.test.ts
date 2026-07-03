import type { Mocked } from "vitest";
import { changePassword } from "@/server/services/user/password";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import type { IEmailService } from "@/server/services/email/auth/email-service";

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

const mockEmailService = (): Mocked<IEmailService> => ({
  sendVerificationEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
});

const USER_ID = "user-id-1";
const USER_EMAIL = "test@example.com";
const USER_NAME = "テスト";
const CURRENT_PASSWORD = "currentpassword123";
const NEW_PASSWORD = "newpassword123";

describe("changePassword", () => {
  describe("正常系", () => {
    it("現在のパスワードが正しく新パスワードが8文字以上の場合、パスワードを更新する", async () => {
      const userRepo = mockUserRepo();
      const emailService = mockEmailService();
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash(CURRENT_PASSWORD, 10);
      userRepo.findByIdForAuth.mockResolvedValue({ id: USER_ID, email: USER_EMAIL, name: USER_NAME, passwordHash: hash });
      userRepo.updatePassword.mockResolvedValue();
      emailService.sendPasswordChangedEmail.mockResolvedValue({ status: "ok" });

      const result = await changePassword(userRepo, emailService, USER_ID, {
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
      });

      expect(result).toEqual({ status: "ok" });
    });

    it("updatePassword が正しい userId で呼ばれる", async () => {
      const userRepo = mockUserRepo();
      const emailService = mockEmailService();
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash(CURRENT_PASSWORD, 10);
      userRepo.findByIdForAuth.mockResolvedValue({ id: USER_ID, email: USER_EMAIL, name: USER_NAME, passwordHash: hash });
      userRepo.updatePassword.mockResolvedValue();
      emailService.sendPasswordChangedEmail.mockResolvedValue({ status: "ok" });

      await changePassword(userRepo, emailService, USER_ID, {
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
      });

      expect(userRepo.updatePassword).toHaveBeenCalledTimes(1);
      const [calledId, calledHash] = userRepo.updatePassword.mock.calls[0];
      expect(calledId).toBe(USER_ID);
      expect(calledHash).not.toBe(NEW_PASSWORD); // ハッシュ化されている
      expect(calledHash).toBeTruthy();
    });

    it("findByIdForAuth が正しい userId で呼ばれる", async () => {
      const userRepo = mockUserRepo();
      const emailService = mockEmailService();
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash(CURRENT_PASSWORD, 10);
      userRepo.findByIdForAuth.mockResolvedValue({ id: USER_ID, email: USER_EMAIL, name: USER_NAME, passwordHash: hash });
      userRepo.updatePassword.mockResolvedValue();
      emailService.sendPasswordChangedEmail.mockResolvedValue({ status: "ok" });

      await changePassword(userRepo, emailService, USER_ID, {
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
      });

      expect(userRepo.findByIdForAuth).toHaveBeenCalledWith(USER_ID);
    });

    it("新パスワードが現在のパスワードと同一でも成功する（意図的な仕様）", async () => {
      const userRepo = mockUserRepo();
      const emailService = mockEmailService();
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash(CURRENT_PASSWORD, 10);
      userRepo.findByIdForAuth.mockResolvedValue({ id: USER_ID, email: USER_EMAIL, name: USER_NAME, passwordHash: hash });
      userRepo.updatePassword.mockResolvedValue();
      emailService.sendPasswordChangedEmail.mockResolvedValue({ status: "ok" });

      const result = await changePassword(userRepo, emailService, USER_ID, {
        currentPassword: CURRENT_PASSWORD,
        newPassword: CURRENT_PASSWORD,
      });

      expect(result).toEqual({ status: "ok" });
    });

    it("パスワード更新後、登録メールアドレス宛に変更通知メールを送信する", async () => {
      const userRepo = mockUserRepo();
      const emailService = mockEmailService();
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash(CURRENT_PASSWORD, 10);
      userRepo.findByIdForAuth.mockResolvedValue({ id: USER_ID, email: USER_EMAIL, name: USER_NAME, passwordHash: hash });
      userRepo.updatePassword.mockResolvedValue();
      emailService.sendPasswordChangedEmail.mockResolvedValue({ status: "ok" });

      await changePassword(userRepo, emailService, USER_ID, {
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
      });

      expect(emailService.sendPasswordChangedEmail).toHaveBeenCalledWith({ to: USER_EMAIL, name: USER_NAME, changedAt: expect.any(Date) });
    });
  });

  describe("異常系", () => {
    it("ユーザーが存在しない場合、user_not_found を返し updatePassword・メール送信は呼ばれない", async () => {
      const userRepo = mockUserRepo();
      const emailService = mockEmailService();
      userRepo.findByIdForAuth.mockResolvedValue(null);

      const result = await changePassword(userRepo, emailService, USER_ID, {
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
      });

      expect(result).toEqual({ status: "error", reason: "user_not_found" });
      expect(userRepo.updatePassword).not.toHaveBeenCalled();
      expect(emailService.sendPasswordChangedEmail).not.toHaveBeenCalled();
    });

    it("passwordHash が null（OAuthのみユーザー）の場合、no_password を返し updatePassword・メール送信は呼ばれない", async () => {
      const userRepo = mockUserRepo();
      const emailService = mockEmailService();
      userRepo.findByIdForAuth.mockResolvedValue({ id: USER_ID, email: USER_EMAIL, name: USER_NAME, passwordHash: null });

      const result = await changePassword(userRepo, emailService, USER_ID, {
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
      });

      expect(result).toEqual({ status: "error", reason: "no_password" });
      expect(userRepo.updatePassword).not.toHaveBeenCalled();
      expect(emailService.sendPasswordChangedEmail).not.toHaveBeenCalled();
    });

    it("現在のパスワードが不一致の場合、invalid_current_password を返し updatePassword・メール送信は呼ばれない", async () => {
      const userRepo = mockUserRepo();
      const emailService = mockEmailService();
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash(CURRENT_PASSWORD, 10);
      userRepo.findByIdForAuth.mockResolvedValue({ id: USER_ID, email: USER_EMAIL, name: USER_NAME, passwordHash: hash });

      const result = await changePassword(userRepo, emailService, USER_ID, {
        currentPassword: "wrongpassword",
        newPassword: NEW_PASSWORD,
      });

      expect(result).toEqual({ status: "error", reason: "invalid_current_password" });
      expect(userRepo.updatePassword).not.toHaveBeenCalled();
      expect(emailService.sendPasswordChangedEmail).not.toHaveBeenCalled();
    });
  });
});
