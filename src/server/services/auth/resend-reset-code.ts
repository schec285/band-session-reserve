import crypto from "crypto";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import type { IVerificationTokenRepository } from "@/server/repositories/auth/verification-token-repository";
import type { IEmailService } from "@/server/services/email/auth/email-service";

const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10分

type ResendResetCodeResult =
  | { status: "ok"; tokenId: string }
  | { status: "error"; reason: "invalid" | "expired" };

/**
 * パスワードリセットコードを再送する。
 * tokenId でトークンを検索し、emailHash を照合する。
 * 旧トークンを削除して新しいコードを生成し、パスワードリセットメールを送信する。
 * 成功時は新しいトークンの tokenId を返す。
 */
export async function resendResetCode(
  userRepo: IUserRepository,
  tokenRepo: IVerificationTokenRepository,
  emailService: IEmailService,
  data: { tokenId: string; emailHash: string }
): Promise<ResendResetCodeResult> {
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
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  await tokenRepo.deleteById(data.tokenId);
  const { id: tokenId } = await tokenRepo.create({ userId: token.userId, codeHash, expiresAt });
  await emailService.sendPasswordResetEmail({ to: user.email, name: user.name ?? "", code });
  return { status: "ok", tokenId };
}
