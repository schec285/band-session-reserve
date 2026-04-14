import { NextResponse } from "next/server";
import { Resend } from "resend";
import { verifyEmail } from "@/server/services/auth/verify-email";
import { DrizzleUserRepository } from "@/server/repositories/auth/user-repository.drizzle";
import { DrizzleVerificationTokenRepository } from "@/server/repositories/auth/verification-token-repository.drizzle";
import { ResendEmailService } from "@/server/services/email/auth/email-service.resend";
import { parseVerifyCookie } from "@/lib/auth/hmac";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "認証コードが正しくありません",
  expired: "認証コードの有効期限が切れています",
  restart: "最初からやり直してください",
};

/**
 * メールアドレス認証エンドポイント。
 * クッキーの HMAC を検証して tokenId・emailHash を取得し、code と照合する。
 * 認証成功時はクッキーを削除する。
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { code } = body;

  if (!code) {
    return NextResponse.json(
      { message: "入力内容に誤りがあります", errors: [{ field: "code", message: "認証コードを入力してください" }] },
      { status: 400 }
    );
  }

  // クッキーから HMAC 検証して tokenId・emailHash を取得
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

  const result = await verifyEmail(userRepo, tokenRepo, emailService, { tokenId, emailHash, code });

  if (result.status === "error") {
    const message = ERROR_MESSAGES[result.reason];
    const response = NextResponse.json({ message, reason: result.reason }, { status: 400 });
    if (result.reason === "expired" || result.reason === "restart") {
      response.cookies.delete("signup_verify_token");
      response.cookies.set("flash", JSON.stringify({ type: "error", message }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60,
      });
    }
    return response;
  }

  const response = NextResponse.json({ message: "メールアドレスの認証が完了しました" }, { status: 200 });
  response.cookies.delete("signup_verify_token");
  response.cookies.set("flash", JSON.stringify({ type: "success", message: "メールアドレスの認証が完了しました" }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60,
  });
  return response;
}
