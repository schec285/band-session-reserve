import { NextResponse } from "next/server";
import { validateCsrfToken } from "@/server/services/csrf/csrf";
import { authenticateUser } from "@/server/services/auth/user";
import { createSession } from "@/server/services/auth/session";
import { DrizzleUserRepository } from "@/server/repositories/auth/user-repository.drizzle";
import { DrizzleSessionRepository } from "@/server/repositories/auth/session-repository.drizzle";

/**
 * ログインエンドポイント。
 * メールアドレスとパスワードで認証し、セッションCookieを発行する。
 */
export async function POST(request: Request) {
  if (!validateCsrfToken(request)) {
    return NextResponse.json({ success: false, message: "CSRFトークンが無効です" }, { status: 403 });
  }

  const body = await request.json();
  const { email, password } = body;

  if (!email) {
    return NextResponse.json({ success: false, message: "メールアドレスは必須です" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, message: "メールアドレスの形式が不正です" }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ success: false, message: "パスワードは必須です" }, { status: 400 });
  }

  const userRepo = new DrizzleUserRepository();
  const sessionRepo = new DrizzleSessionRepository();

  const result = await authenticateUser(userRepo, email, password);
  if (result.status !== "ok") {
    return NextResponse.json(
      { success: false, message: "メールアドレスまたはパスワードが正しくありません" },
      { status: 401 }
    );
  }

  const sessionToken = await createSession(sessionRepo, result.user.id);

  return NextResponse.json(
    { success: true, message: "ログインしました", role: result.user.role },
    {
      headers: {
        "Set-Cookie": `session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/`,
      },
    }
  );
}
