import crypto from "crypto";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import type { IVerificationTokenRepository } from "@/server/repositories/auth/verification-token-repository";
import type { IEmailService } from "@/server/services/email/auth/email-service";
import { hashPassword } from "@/server/services/auth/password-hash";

const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10分

type SignUpResult = { status: "ok"; tokenId: string };

/**
 * ユーザー登録を行う。
 * - 新規ユーザー: ユーザー作成 → コード生成 → トークン保存 → 認証メール送信
 * - 未認証の既存ユーザー: コード生成 → トークン再作成 → 認証メール送信
 * - 認証済みの既存ユーザー: codeHash null でトークン作成（メール送信なし）
 * 全ケースで tokenId を返す。
 */
export async function signUp(
  userRepo: IUserRepository,
  tokenRepo: IVerificationTokenRepository,
  emailService: IEmailService,
  data: { email: string; password: string; name: string }
): Promise<SignUpResult> {
  const existing = await userRepo.findByEmail(data.email);

  let userId: string;
  let sendCode: boolean;

  if (!existing) {
    // 新規ユーザー
    const passwordHash = await hashPassword(data.password);
    const created = await userRepo.create({ email: data.email, passwordHash, name: data.name });
    userId = created.id;
    sendCode = true;
  } else if (!existing.emailVerified) {
    // 未認証の既存ユーザー: 名前とパスワードを更新
    const passwordHash = await hashPassword(data.password);
    await userRepo.update(existing.id, { passwordHash, name: data.name });
    userId = existing.id;
    sendCode = true;
  } else {
    // 認証済みの既存ユーザー
    userId = existing.id;
    sendCode = false;
  }

  await tokenRepo.deleteByUserId(userId);

  if (sendCode) {
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS);
    const { id: tokenId } = await tokenRepo.create({ userId, codeHash, expiresAt });
    await emailService.sendVerificationEmail({ to: data.email, name: data.name, code });
    return { status: "ok", tokenId };
  } else {
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS);
    const { id: tokenId } = await tokenRepo.create({ userId, codeHash: null, expiresAt });
    return { status: "ok", tokenId };
  }
}
