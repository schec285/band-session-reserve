import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const isAuthenticated = !!request.auth;

  // 認証が必要な API ルート（未認証なら 401）
  const isProtectedApi = pathname.startsWith("/api/reserve");
  if (isProtectedApi && !isAuthenticated) {
    return NextResponse.json({ message: "認証が必要です" }, { status: 401 });
  }

  // 管理者 API ルート（未認証なら 401）
  const isAdminApi = pathname.startsWith("/api/admin");
  if (isAdminApi && !isAuthenticated) {
    return NextResponse.json({ message: "認証が必要です" }, { status: 401 });
  }

  // 管理者ページ（未認証ならサインインへリダイレクト）
  const isAdminPage = pathname.startsWith("/admin");
  if (isAdminPage && !isAuthenticated) {
    return NextResponse.redirect(new URL("/auth/signin?callbackUrl=/admin", request.url));
  }

  // メール認証ページ（クッキーなし or 期限切れ → サインアップへ）
  if (pathname.startsWith("/auth/signup/verify")) {
    const verifyToken = request.cookies.get("signup_verify_token");
    const parts = verifyToken?.value.split(".");
    const isValid = parts?.length === 4 && Date.now() <= Number(parts[2]);
    if (!isValid) {
      const res = NextResponse.redirect(new URL("/auth/signup", request.url));
      const message = verifyToken
        ? "認証コードの有効期限が切れています。もう一度登録してください"
        : "セッションが無効です。最初からやり直してください";
      res.cookies.set("flash", JSON.stringify({ type: "error", message }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60,
      });
      return res;
    }
  }

  // パスワードリセット コード入力ページ（クッキーなし or 期限切れ → リセットリクエストへ）
  if (pathname.startsWith("/auth/reset-password/verify")) {
    const verifyToken = request.cookies.get("reset_verify_token");
    const parts = verifyToken?.value.split(".");
    const isValid = parts?.length === 4 && Date.now() <= Number(parts[2]);
    if (!isValid) {
      const res = NextResponse.redirect(new URL("/auth/reset-password", request.url));
      const message = verifyToken
        ? "認証コードの有効期限が切れています。もう一度やり直してください"
        : "セッションが無効です。最初からやり直してください";
      res.cookies.set("flash", JSON.stringify({ type: "error", message }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60,
      });
      return res;
    }
  }

  // パスワードリセット 新パスワード入力ページ（クッキーなし or 期限切れ → リセットリクエストへ）
  if (pathname.startsWith("/auth/reset-password/new-password")) {
    const resetToken = request.cookies.get("reset_token");
    const parts = resetToken?.value.split(".");
    const isValid = parts?.length === 4 && Date.now() <= Number(parts[2]);
    if (!isValid) {
      const res = NextResponse.redirect(new URL("/auth/reset-password", request.url));
      const message = resetToken
        ? "セッションの有効期限が切れています。もう一度やり直してください"
        : "セッションが無効です。最初からやり直してください";
      res.cookies.set("flash", JSON.stringify({ type: "error", message }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60,
      });
      return res;
    }
  }

  // サインイン・サインアップページ（認証済みならトップへリダイレクト）
  const isAuthPage =
    pathname === "/auth/signin" ||
    pathname === "/auth/signup";

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
