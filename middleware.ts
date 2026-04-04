import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";

/**
 * グローバルミドルウェア。
 * CSRF クッキーが未発行の場合にトークンを生成してセットする。
 * フロントエンドは JS でこのクッキーを読み取り、副作用リクエストの X-CSRF-Token ヘッダーに付与する。
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get("csrf")) {
    response.cookies.set("csrf", randomUUID(), {
      secure: true,
      sameSite: "strict",
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
