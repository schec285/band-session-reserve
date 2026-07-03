import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import type { IVerificationTokenRepository } from "@/server/repositories/auth/verification-token-repository";
import type { IEmailService } from "@/server/services/email/auth/email-service";

const SALT_ROUNDS = 10;

type ResetPasswordResult =
  | { status: "ok" }
  | { status: "error"; reason: "invalid" | "expired" };

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

  const passwordHash = await bcrypt.hash(data.newPassword, SALT_ROUNDS);
  await userRepo.updatePassword(token.userId, passwordHash);
  await tokenRepo.deleteById(data.tokenId);
  await emailService.sendPasswordChangedEmail({ to: user.email, name: user.name });
  return { status: "ok" };
}
