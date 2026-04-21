import crypto from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { signUp } from "@/server/services/auth/signup";
import { DrizzleUserRepository } from "@/server/repositories/auth/user-repository.drizzle";
import { DrizzleVerificationTokenRepository } from "@/server/repositories/auth/verification-token-repository.drizzle";
import { ResendEmailService } from "@/server/services/email/auth/email-service.resend";
import { createVerifyCookieValue } from "@/lib/auth/hmac";
import { withApiHandler } from "@/lib/api/error-handler";
import { SignUpSchema } from "@/lib/types/api/auth/signup";

const COOKIE_MAX_AGE = 10 * 60; // 10分（秒）

/**
 * ユーザー登録エンドポイント。
 * バリデーション後、ユーザーを作成し認証コードを発行する。
 * レスポンスに HMAC 署名済みクッキー（emailHash + tokenId + 有効期限）を付与する。
 * 全ケースで 201 を返し、登録状態を隠蔽する。
 */
export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await request.json();

    const parsed = SignUpSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => ({
        field: String(e.path[0]),
        message: e.message,
      }));
      return NextResponse.json({ message: "入力内容に誤りがあります", errors }, { status: 400 });
    }

    const { email, password, name } = parsed.data;

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
  });
}
