import crypto from "crypto";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import type { IVerificationTokenRepository } from "@/server/repositories/auth/verification-token-repository";
import type { IEmailService } from "@/server/services/email/auth/email-service";

const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10分

type RequestPasswordResetResult = { status: "ok"; tokenId: string };

/**
 * パスワードリセットをリクエストする。
 * - 有効ユーザー（認証済み・passwordHash あり）: コード生成・トークン保存・メール送信
 * - 無効ユーザー（OAuth のみ / 未認証）: codeHash=null でトークン作成・メール送信なし
 * - 存在しないユーザー: fake tokenId を返すだけで DB 操作・メール送信なし
 * クライアント側はすべてのケースで同じ挙動になる。
 */
export async function requestPasswordReset(
  userRepo: IUserRepository,
  tokenRepo: IVerificationTokenRepository,
  emailService: IEmailService,
  data: { email: string }
): Promise<RequestPasswordResetResult> {
  const user = await userRepo.findByEmail(data.email);

  if (!user) {
    return { status: "ok", tokenId: crypto.randomUUID() };
  }

  await tokenRepo.deleteByUserId(user.id);

  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS);

  if (user.emailVerified) {
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const { id: tokenId } = await tokenRepo.create({ userId: user.id, codeHash, expiresAt });
    await emailService.sendPasswordResetEmail({ to: data.email, name: user.name, code });
    return { status: "ok", tokenId };
  } else {
    const { id: tokenId } = await tokenRepo.create({ userId: user.id, codeHash: null, expiresAt });
    return { status: "ok", tokenId };
  }
}
