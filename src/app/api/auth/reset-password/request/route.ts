import crypto from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requestPasswordReset } from "@/server/services/auth/reset-password-request";
import { DrizzleUserRepository } from "@/server/repositories/auth/user-repository.drizzle";
import { DrizzleVerificationTokenRepository } from "@/server/repositories/auth/verification-token-repository.drizzle";
import { ResendEmailService } from "@/server/services/email/auth/email-service.resend";
import { createVerifyCookieValue } from "@/lib/auth/hmac";
import { withApiHandler } from "@/lib/api/error-handler";
import { ResetPasswordRequestSchema } from "@/lib/types/api/auth/reset-password";

const COOKIE_MAX_AGE = 10 * 60; // 10分（秒）

/**
 * パスワードリセットリクエストエンドポイント。
 * メールアドレスを受け取り、reset_verify_token クッキーを発行する。
 * ユーザーの存在有無に関わらず常に 200 を返す（タイミング攻撃対策）。
 */
export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await request.json();
    const parsed = ResetPasswordRequestSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        field: issue.path[0] as string,
        message: issue.message,
      }));
      return NextResponse.json({ message: "入力内容に誤りがあります", errors }, { status: 400 });
    }

    const userRepo = new DrizzleUserRepository();
    const tokenRepo = new DrizzleVerificationTokenRepository();
    const emailService = new ResendEmailService(new Resend(process.env.RESEND_API_KEY));

    const result = await requestPasswordReset(userRepo, tokenRepo, emailService, { email: parsed.data.email });

    const emailHash = crypto.createHash("sha256").update(parsed.data.email).digest("hex");
    const expiresAt = Date.now() + COOKIE_MAX_AGE * 1000;
    const cookieValue = createVerifyCookieValue(emailHash, result.tokenId, expiresAt);

    const response = NextResponse.json({ message: "メールアドレスを確認してください" }, { status: 200 });
    response.cookies.set("reset_verify_token", cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    return response;
  });
}
