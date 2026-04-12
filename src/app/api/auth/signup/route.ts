import crypto from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { signUp } from "@/server/services/auth/signup";
import { DrizzleUserRepository } from "@/server/repositories/auth/user-repository.drizzle";
import { DrizzleVerificationTokenRepository } from "@/server/repositories/auth/verification-token-repository.drizzle";
import { ResendEmailService } from "@/server/services/email/auth/email-service.resend";
import { createVerifyCookieValue } from "@/lib/auth/hmac";

const COOKIE_MAX_AGE = 10 * 60; // 10分（秒）

/**
 * ユーザー登録エンドポイント。
 * バリデーション後、ユーザーを作成し認証コードを発行する。
 * レスポンスに HMAC 署名済みクッキー（emailHash + tokenId + 有効期限）を付与する。
 * 全ケースで 201 を返し、登録状態を隠蔽する。
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, name } = body;

  const errors: { field: string; message: string }[] = [];
  if (!email) errors.push({ field: "email", message: "メールアドレスを入力してください" });
  if (!password) {
    errors.push({ field: "password", message: "パスワードを入力してください" });
  } else if (password.length < 8) {
    errors.push({ field: "password", message: "パスワードは8文字以上で入力してください" });
  }
  if (!name) errors.push({ field: "name", message: "名前を入力してください" });

  if (errors.length > 0) {
    return NextResponse.json({ message: "入力内容に誤りがあります", errors }, { status: 400 });
  }

  const userRepo = new DrizzleUserRepository();
  const tokenRepo = new DrizzleVerificationTokenRepository();
  const emailService = new ResendEmailService(new Resend(process.env.RESEND_API_KEY));
  const { tokenId } = await signUp(userRepo, tokenRepo, emailService, { email, password, name });

  const emailHash = crypto.createHash("sha256").update(email).digest("hex");
  const expiresAt = Date.now() + COOKIE_MAX_AGE * 1000;
  const cookieValue = createVerifyCookieValue(emailHash, tokenId, expiresAt);

  const response = NextResponse.json({ message: "確認メールを送信しました" }, { status: 201 });
  response.cookies.set("signup_verify_token", cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return response;
}
