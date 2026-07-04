import { NextResponse } from "next/server";
import { verifyResetCode } from "@/server/services/auth/verify-reset-code";
import { DrizzleUserRepository } from "@/server/repositories/auth/user-repository.drizzle";
import { DrizzleVerificationTokenRepository } from "@/server/repositories/auth/verification-token-repository.drizzle";
import { parseVerifyCookie, createVerifyCookieValue } from "@/lib/auth/hmac";
import { withApiHandler } from "@/lib/api/error-handler";
import { verifyCsrfToken } from "@/lib/api/csrf";

const COOKIE_MAX_AGE = 10 * 60; // 10分（秒）

/**
 * パスワードリセットコード検証エンドポイント。
 * reset_verify_token の HMAC を検証し、6桁コードを照合する。
 * 成功時は reset_token を発行し reset_verify_token を削除する。
 */
export async function POST(request: Request) {
  return withApiHandler(async () => {
    const csrfError = verifyCsrfToken(request);
    if (csrfError) return csrfError;

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { message: "入力内容に誤りがあります", errors: [{ field: "code", message: "認証コードを入力してください" }] },
        { status: 400 }
      );
    }

    const cookieHeader = request.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/reset_verify_token=([^;]+)/);
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

    const result = await verifyResetCode(userRepo, tokenRepo, { tokenId, emailHash, code });

    if (result.status === "error") {
      const response = NextResponse.json({ message: "認証コードが正しくありません", reason: result.reason }, { status: 400 });
      if (result.reason === "expired" || result.reason === "restart") {
        response.cookies.delete("reset_verify_token");
      }
      return response;
    }

    const expiresAt = Date.now() + COOKIE_MAX_AGE * 1000;
    const newCookieValue = createVerifyCookieValue(emailHash, result.tokenId, expiresAt);

    const response = NextResponse.json({ message: "コードの確認が完了しました" }, { status: 200 });
    response.cookies.set("reset_token", newCookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    response.cookies.delete("reset_verify_token");
    return response;
  });
}
