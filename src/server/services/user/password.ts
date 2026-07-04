import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import type { IEmailService } from "@/server/services/email/auth/email-service";
import { hashPassword, verifyPassword } from "@/server/services/auth/password-hash";
import { isPasswordSimilarToIdentity } from "@/lib/utils/password";

type ChangePasswordResult =
  | { status: "ok" }
  | {
      status: "error";
      reason: "user_not_found" | "no_password" | "invalid_current_password" | "password_similar_to_identity";
    };

/**
 * ログイン中ユーザーのパスワードを変更する。
 * 現在のパスワードを照合したうえで新パスワードのハッシュに更新し、
 * 登録メールアドレス宛に変更完了メールを送信する。
 */
export async function changePassword(
  repo: IUserRepository,
  emailService: IEmailService,
  userId: string,
  input: { currentPassword: string; newPassword: string }
): Promise<ChangePasswordResult> {
  const user = await repo.findByIdForAuth(userId);
  if (!user) return { status: "error", reason: "user_not_found" };
  if (user.passwordHash === null) return { status: "error", reason: "no_password" };

  const { valid } = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) return { status: "error", reason: "invalid_current_password" };

  if (isPasswordSimilarToIdentity(input.newPassword, { email: user.email, name: user.name })) {
    return { status: "error", reason: "password_similar_to_identity" };
  }

  const passwordHash = await hashPassword(input.newPassword);
  await repo.updatePassword(userId, passwordHash);
  await emailService.sendPasswordChangedEmail({ to: user.email, name: user.name ?? "", changedAt: new Date() });
  return { status: "ok" };
}
