import { NextRequest, NextResponse } from "next/server";

/**
 * Thin Proxy レイヤー。
 * DB を参照せず Cookie の有無だけで高速に認証チェックを行う。
 * 厳密なセッション検証は各サーバーコンポーネント・APIルートで行う。
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // NextAuth v5 (Auth.js) のセッション Cookie（開発時と本番で名前が異なる）
  const sessionCookie =
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token");

  const isAuthenticated = !!sessionCookie;

  // 認証が必要な API ルート（Cookie なしなら 401）
  const isProtectedApi = pathname.startsWith("/api/reserve");
  if (isProtectedApi && !isAuthenticated) {
    return NextResponse.json({ message: "認証が必要です" }, { status: 401 });
  }

  // 管理者 API ルート（Cookie なしなら 401）
  const isAdminApi = pathname.startsWith("/api/admin");
  if (isAdminApi && !isAuthenticated) {
    return NextResponse.json({ message: "認証が必要です" }, { status: 401 });
  }

  // 管理者ページ（Cookie なしならサインインへリダイレクト）
  const isAdminPage = pathname.startsWith("/admin");
  if (isAdminPage && !isAuthenticated) {
    return NextResponse.redirect(new URL("/auth/signin?callbackUrl=/admin", request.url));
  }

  // 認証済みユーザーが /auth/* にアクセスした場合はトップへ
  if (pathname.startsWith("/auth/") && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // メール認証ページ（クッキーなし or 期限切れ → サインアップへ）
  if (pathname.startsWith("/auth/signup/verify")) {
    const verifyToken = request.cookies.get("signup_verify_token");
    const parts = verifyToken?.value.split(".");
    const isValid = parts?.length === 4 && Date.now() <= Number(parts[2]);
    if (!isValid) {
      return NextResponse.redirect(new URL("/auth/signup", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
