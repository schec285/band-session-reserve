import { NextResponse } from "next/server";
import { validateCsrfToken } from "@/server/services/csrf/csrf";
import { getSession, invalidateSession } from "@/server/services/auth/session";
import { DrizzleSessionRepository } from "@/server/repositories/auth/session-repository.drizzle";

/**
 * ログアウトエンドポイント。
 * セッションをDBから削除し、セッションCookieを無効化する。
 */
export async function POST(request: Request) {
  if (!validateCsrfToken(request)) {
    return NextResponse.json({ success: false, message: "CSRFトークンが無効です" }, { status: 403 });
  }

  const sessionRepo = new DrizzleSessionRepository();
  const session = await getSession(sessionRepo, request);

  if (!session) {
    return NextResponse.json({ success: false, message: "認証が必要です" }, { status: 401 });
  }

  const cookie = request.headers.get("Cookie") ?? "";
  const tokenMatch = cookie.match(/session=([^;]+)/);
  const sessionToken = tokenMatch?.[1] ?? "";

  await invalidateSession(sessionRepo, sessionToken);

  return NextResponse.json(
    { success: true, message: "ログアウトしました" },
    {
      headers: {
        "Set-Cookie": "session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict",
      },
    }
  );
}
