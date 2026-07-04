import crypto from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { resendVerification } from "@/server/services/auth/resend-verification";
import { DrizzleUserRepository } from "@/server/repositories/auth/user-repository.drizzle";
import { DrizzleVerificationTokenRepository } from "@/server/repositories/auth/verification-token-repository.drizzle";
import { ResendEmailService } from "@/server/services/email/auth/email-service.resend";
import { parseVerifyCookie, createVerifyCookieValue } from "@/lib/auth/hmac";
import { withApiHandler } from "@/lib/api/error-handler";
import { verifyCsrfToken } from "@/lib/api/csrf";

const COOKIE_MAX_AGE = 10 * 60; // 10分（秒）

/**
 * 認証コード再送エンドポイント。
 * クッキーの HMAC を検証して tokenId・emailHash を取得し、新しいコードを発行する。
 * 成功時は新しい tokenId を含む HMAC クッキーを発行する。
 */
export async function POST(request: Request) {
  return withApiHandler(async () => {
    const csrfError = verifyCsrfToken(request);
    if (csrfError) return csrfError;

    const cookieHeader = request.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/signup_verify_token=([^;]+)/);
    const cookieValue = match?.[1] ?? "";
    const parsed = parseVerifyCookie(cookieValue);

    if (!parsed) {
      return NextResponse.json(
        { message: "セッションが無効です。最初からやり直してください", reason: "restart" },
        { status: 401 }
      );
    }

    const { tokenId, emailHash } = parsed;

    const userRepo = new DrizzleUserRepository();
    const tokenRepo = new DrizzleVerificationTokenRepository();
    const emailService = new ResendEmailService(new Resend(process.env.RESEND_API_KEY));

    const result = await resendVerification(userRepo, tokenRepo, emailService, { tokenId, emailHash });

    if (result.status === "error") {
      const response = NextResponse.json(
        {
          message: result.reason === "expired"
            ? "認証コードの有効期限が切れています"
            : "セッションが無効です。最初からやり直してください",
          reason: result.reason === "expired" ? "expired" : "restart",
        },
        { status: 401 }
      );
      response.cookies.delete("signup_verify_token");
      return response;
    }

    const expiresAt = Date.now() + COOKIE_MAX_AGE * 1000;
    const newCookieValue = createVerifyCookieValue(emailHash, result.tokenId, expiresAt);

    const response = NextResponse.json({ message: "認証コードを再送しました" }, { status: 200 });
    response.cookies.set("signup_verify_token", newCookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    return response;
  });
}
