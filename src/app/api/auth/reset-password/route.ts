import { NextResponse } from "next/server";
import { resetPassword } from "@/server/services/auth/reset-password";
import { DrizzleUserRepository } from "@/server/repositories/auth/user-repository.drizzle";
import { DrizzleVerificationTokenRepository } from "@/server/repositories/auth/verification-token-repository.drizzle";
import { parseVerifyCookie } from "@/lib/auth/hmac";
import { withApiHandler } from "@/lib/api/error-handler";
import { ResetPasswordSchema } from "@/lib/types/api/auth/reset-password";

/**
 * パスワードリセット実行エンドポイント。
 * reset_token の HMAC を検証し、新パスワードでパスワードを更新する。
 * 成功時は reset_token クッキーを削除する。
 */
export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await request.json();
    const parsedBody = ResetPasswordSchema.safeParse(body);

    if (!parsedBody.success) {
      const errors = parsedBody.error.issues.map((issue) => ({
        field: issue.path[0] as string,
        message: issue.message,
      }));
      return NextResponse.json({ message: "入力内容に誤りがあります", errors }, { status: 400 });
    }

    const cookieHeader = request.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/reset_token=([^;]+)/);
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

    const result = await resetPassword(userRepo, tokenRepo, { tokenId, emailHash, newPassword: parsedBody.data.password });

    if (result.status === "error") {
      const response = NextResponse.json({ message: "パスワードリセットに失敗しました", reason: result.reason }, { status: 400 });
      response.cookies.delete("reset_token");
      return response;
    }

    const response = NextResponse.json({ message: "パスワードを変更しました" }, { status: 200 });
    response.cookies.delete("reset_token");
    response.cookies.set("flash", JSON.stringify({ type: "success", message: "パスワードを変更しました" }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60,
    });
    return response;
  });
}
