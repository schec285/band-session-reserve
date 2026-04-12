import crypto from "crypto";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import type { IVerificationTokenRepository } from "@/server/repositories/auth/verification-token-repository";
import type { IEmailService } from "@/server/services/email/auth/email-service";

const MAX_ATTEMPTS = 5;

type VerifyEmailResult =
  | { status: "ok" }
  | { status: "error"; reason: "invalid" | "expired" | "restart" };

/**
 * メールアドレスの認証コードを検証する。
 * tokenId でトークンを検索し、emailHash・コードハッシュを照合する。
 * 正しければ emailVerified をセットしウェルカムメールを送信する。
 * 5回目の失敗ではトークンを削除して restart を返す。
 */
export async function verifyEmail(
  userRepo: IUserRepository,
  tokenRepo: IVerificationTokenRepository,
  emailService: IEmailService,
  data: { tokenId: string; emailHash: string; code: string }
): Promise<VerifyEmailResult> {
  const token = await tokenRepo.findById(data.tokenId);
  if (!token) return { status: "error", reason: "invalid" };

  const user = await userRepo.findById(token.userId);
  if (!user) return { status: "error", reason: "invalid" };

  // クッキーのメールハッシュとDBのメールアドレスのハッシュを照合
  const dbEmailHash = crypto.createHash("sha256").update(user.email).digest("hex");
  if (dbEmailHash !== data.emailHash) return { status: "error", reason: "invalid" };

  if (token.expiresAt < new Date()) {
    await tokenRepo.deleteById(data.tokenId);
    return { status: "error", reason: "expired" };
  }

  // codeHash が null（認証済み既存ユーザー）またはコード不一致
  const codeHash = crypto.createHash("sha256").update(data.code).digest("hex");
  const isValid = token.codeHash !== null && codeHash === token.codeHash;

  if (!isValid) {
    if (token.attempts + 1 >= MAX_ATTEMPTS) {
      await tokenRepo.deleteById(data.tokenId);
      return { status: "error", reason: "restart" };
    }
    await tokenRepo.incrementAttempts(data.tokenId);
    return { status: "error", reason: "invalid" };
  }

  await userRepo.setEmailVerified(token.userId);
  await tokenRepo.deleteById(data.tokenId);
  await emailService.sendWelcomeEmail({ to: user.email, name: user.name });

  return { status: "ok" };
}
