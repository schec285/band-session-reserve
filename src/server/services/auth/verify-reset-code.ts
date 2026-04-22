import crypto from "crypto";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import type { IVerificationTokenRepository } from "@/server/repositories/auth/verification-token-repository";

const MAX_ATTEMPTS = 5;
const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10分

type VerifyResetCodeResult =
  | { status: "ok"; tokenId: string }
  | { status: "error"; reason: "invalid" | "expired" | "restart" };

/**
 * パスワードリセット用の認証コードを検証する。
 * 成功時は旧トークンを削除し、codeHash=null の新トークンを作成して tokenId を返す。
 * 5回目の失敗ではトークンを削除して restart を返す。
 */
export async function verifyResetCode(
  userRepo: IUserRepository,
  tokenRepo: IVerificationTokenRepository,
  data: { tokenId: string; emailHash: string; code: string }
): Promise<VerifyResetCodeResult> {
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

  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS);
  await tokenRepo.deleteById(data.tokenId);
  const { id: newTokenId } = await tokenRepo.create({ userId: token.userId, codeHash: null, expiresAt });
  return { status: "ok", tokenId: newTokenId };
}
