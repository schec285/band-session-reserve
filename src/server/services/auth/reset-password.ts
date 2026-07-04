import crypto from "crypto";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import type { IVerificationTokenRepository } from "@/server/repositories/auth/verification-token-repository";
import type { IEmailService } from "@/server/services/email/auth/email-service";
import { hashPassword } from "@/server/services/auth/password-hash";
import { isPasswordSimilarToIdentity } from "@/lib/utils/password";

type ResetPasswordResult =
  | { status: "ok" }
  | { status: "error"; reason: "invalid" | "expired" | "password_similar_to_identity" };

/**
 * パスワードリセットを実行する。
 * token.codeHash が null（コード検証済み）であることを確認し、
 * emailHash を照合してパスワードを更新する。
 * 成功後はトークンを削除し、登録メールアドレス宛に変更完了メールを送信する。
 */
export async function resetPassword(
  userRepo: IUserRepository,
  tokenRepo: IVerificationTokenRepository,
  emailService: IEmailService,
  data: { tokenId: string; emailHash: string; newPassword: string }
): Promise<ResetPasswordResult> {
  const token = await tokenRepo.findById(data.tokenId);
  if (!token) return { status: "error", reason: "invalid" };

  if (token.codeHash !== null) return { status: "error", reason: "invalid" };

  const user = await userRepo.findById(token.userId);
  if (!user) return { status: "error", reason: "invalid" };

  const dbEmailHash = crypto.createHash("sha256").update(user.email).digest("hex");
  if (dbEmailHash !== data.emailHash) return { status: "error", reason: "invalid" };

  if (token.expiresAt < new Date()) {
    await tokenRepo.deleteById(data.tokenId);
    return { status: "error", reason: "expired" };
  }

  if (isPasswordSimilarToIdentity(data.newPassword, { email: user.email, name: user.name })) {
    return { status: "error", reason: "password_similar_to_identity" };
  }

  const passwordHash = await hashPassword(data.newPassword);
  await userRepo.updatePassword(token.userId, passwordHash);
  await tokenRepo.deleteById(data.tokenId);
  await emailService.sendPasswordChangedEmail({ to: user.email, name: user.name, changedAt: new Date() });
  return { status: "ok" };
}
