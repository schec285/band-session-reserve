import { NextRequest, NextResponse } from "next/server";

/**
 * Thin Proxy レイヤー。
 * DB を参照せず Cookie の有無だけで高速に認証チェックを行う。
 * 厳密なセッション検証は各サーバーコンポーネント・APIルートで行う。
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // NextAuth のセッション Cookie（開発時と本番で名前が異なる）
  const sessionCookie =
    request.cookies.get("next-auth.session-token") ||
    request.cookies.get("__Secure-next-auth.session-token");

  const isAuthenticated = !!sessionCookie;

  // 認証が必要な API ルート（Cookie なしなら 401）
  const isProtectedApi = pathname.startsWith("/api/reserve");
  if (isProtectedApi && !isAuthenticated) {
    return NextResponse.json({ message: "認証が必要です" }, { status: 401 });
  }

  // 認証済みユーザーがサインイン/サインアップページにアクセスした場合はトップへ
  const authPaths = ["/auth/signin", "/auth/signup"];
  const isAuthPath = authPaths.some((p) => pathname.startsWith(p));
  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
