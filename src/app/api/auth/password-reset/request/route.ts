import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { validateCsrfToken } from "@/server/services/csrf/csrf";
import { findUserByEmail } from "@/server/services/auth/user";
import { generateChallenge } from "@/server/services/auth/challenge";
import { saveCode } from "@/server/services/auth/verification";
import { sendPasswordResetEmail } from "@/server/services/auth/email";
import { DrizzleUserRepository } from "@/server/repositories/auth/user-repository.drizzle";
import { DrizzleChallengeRepository } from "@/server/repositories/auth/challenge-repository.drizzle";
import { DrizzleVerificationRepository } from "@/server/repositories/auth/verification-repository.drizzle";

/**
 * パスワードリセット申請エンドポイント。
 * メールアドレスが存在する場合のみリセットコードを送信する。
 * 列挙攻撃対策として、存在しないメールアドレスでも同じレスポンスを返す。
 */
export async function POST(request: Request) {
  if (!validateCsrfToken(request)) {
    return NextResponse.json({ success: false, message: "CSRFトークンが無効です" }, { status: 403 });
  }

  const body = await request.json();
  const { email } = body;

  if (!email) {
    return NextResponse.json({ success: false, message: "メールアドレスは必須です" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, message: "メールアドレスの形式が不正です" }, { status: 400 });
  }

  const userRepo = new DrizzleUserRepository();
  const challengeRepo = new DrizzleChallengeRepository();
  const verificationRepo = new DrizzleVerificationRepository();

  const sessionId = randomUUID();
  const user = await findUserByEmail(userRepo, email);
  const nonce = await generateChallenge(challengeRepo, sessionId, "password-reset");

  if (user) {
    const code = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await saveCode(verificationRepo, sessionId, user.id, code, expiresAt);
    await sendPasswordResetEmail(email, code);
  }

  return NextResponse.json(
    { success: true },
    {
      headers: {
        "Set-Cookie": `challenge=${sessionId}:${nonce}; Secure; SameSite=Strict; Path=/api/auth/password-reset`,
      },
    }
  );
}
