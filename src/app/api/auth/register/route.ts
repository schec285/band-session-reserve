import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { validateCsrfToken } from "@/server/services/csrf/csrf";
import { findUserByUsername, findUserByEmail, createUser } from "@/server/services/auth/user";
import { generateChallenge } from "@/server/services/auth/challenge";
import { saveCode } from "@/server/services/auth/verification";
import { sendVerificationEmail } from "@/server/services/auth/email";
import { DrizzleUserRepository } from "@/server/repositories/auth/user-repository.drizzle";
import { DrizzleChallengeRepository } from "@/server/repositories/auth/challenge-repository.drizzle";
import { DrizzleVerificationRepository } from "@/server/repositories/auth/verification-repository.drizzle";

/**
 * ユーザー登録エンドポイント。
 * バリデーション・重複チェック通過後、ユーザーを作成し認証コードを発行してメールで送信する。
 * チャレンジをCookieに発行し、メール認証フローを開始する。
 */
export async function POST(request: Request) {
  if (!validateCsrfToken(request)) {
    return NextResponse.json({ success: false, message: "CSRFトークンが無効です" }, { status: 403 });
  }

  const body = await request.json();
  const { username, email, password } = body;

  if (!username) {
    return NextResponse.json({ success: false, message: "ユーザー名は必須です" }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ success: false, message: "メールアドレスは必須です" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, message: "メールアドレスの形式が不正です" }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ success: false, message: "パスワードは必須です" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { success: false, message: "パスワードは12文字以上で、大文字・数字・記号を各1文字以上含めてください" },
      { status: 400 }
    );
  }

  const userRepo = new DrizzleUserRepository();
  const challengeRepo = new DrizzleChallengeRepository();
  const verificationRepo = new DrizzleVerificationRepository();

  const existingByUsername = await findUserByUsername(userRepo, username);
  if (existingByUsername) {
    return NextResponse.json({ success: false, message: "このユーザー名は既に使用されています" }, { status: 409 });
  }

  const existingByEmail = await findUserByEmail(userRepo, email);
  if (existingByEmail) {
    return NextResponse.json({ success: false, message: "このメールアドレスは既に使用されています" }, { status: 409 });
  }

  await createUser(userRepo, { username, email, password });

  const sessionId = randomUUID();
  const code = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await saveCode(verificationRepo, sessionId, null, code, expiresAt);
  const nonce = await generateChallenge(challengeRepo, sessionId, "verify-email");
  await sendVerificationEmail(email, code);

  return NextResponse.json(
    { success: true },
    {
      status: 201,
      headers: {
        "Set-Cookie": `challenge=${sessionId}:${nonce}; Secure; SameSite=Strict; Path=/api/auth/verify-email`,
      },
    }
  );
}
