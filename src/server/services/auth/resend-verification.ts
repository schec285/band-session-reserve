import crypto from "crypto";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import type { IVerificationTokenRepository } from "@/server/repositories/auth/verification-token-repository";
import type { IEmailService } from "@/server/services/email/auth/email-service";

const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10分

type ResendVerificationResult =
  | { status: "ok"; tokenId: string }
  | { status: "error"; reason: "invalid" | "expired" };

/**
 * 認証コードを再送する。
 * tokenId でトークンを検索し、emailHash を照合する。
 * codeHash が null（認証済みユーザー）の場合はメール送信なしで新トークンを作成する。
 * それ以外は新しいコードを生成して認証メールを送信する。
 * 成功時は新しいトークンの tokenId を返す。
 */
export async function resendVerification(
  userRepo: IUserRepository,
  tokenRepo: IVerificationTokenRepository,
  emailService: IEmailService,
  data: { tokenId: string; emailHash: string }
): Promise<ResendVerificationResult> {
  const token = await tokenRepo.findById(data.tokenId);
  if (!token) return { status: "error", reason: "invalid" };

  const user = await userRepo.findById(token.userId);
  if (!user) return { status: "error", reason: "invalid" };

  const dbEmailHash = crypto.createHash("sha256").update(user.email).digest("hex");
  if (dbEmailHash !== data.emailHash) return { status: "error", reason: "invalid" };

  if (token.expiresAt < new Date()) {
    await tokenRepo.deleteById(data.tokenId);
    return { status: "error", reason: "expired" };
  }

  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS);

  if (token.codeHash === null) {
    // 認証済み既存ユーザー：メール送信なし
    await tokenRepo.deleteById(data.tokenId);
    const { id: tokenId } = await tokenRepo.create({ userId: token.userId, codeHash: null, expiresAt });
    return { status: "ok", tokenId };
  }

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  await tokenRepo.deleteById(data.tokenId);
  const { id: tokenId } = await tokenRepo.create({ userId: token.userId, codeHash, expiresAt });
  await emailService.sendVerificationEmail({ to: user.email, name: user.name, code });
  return { status: "ok", tokenId };
}
