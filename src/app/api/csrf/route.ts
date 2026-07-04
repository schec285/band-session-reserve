import { NextResponse } from "next/server";
import { CSRF_COOKIE_MAX_AGE, CSRF_COOKIE_NAME, generateCsrfCookieValue } from "@/lib/auth/csrf";

/**
 * CSRF トークンクッキーを発行するエンドポイント。
 * 状態変更は行わず、二重送信Cookie方式で使うクッキーの発行のみを行う。
 */
export async function GET() {
  const cookieValue = generateCsrfCookieValue();
  const response = NextResponse.json({ message: "CSRFトークンを発行しました" });
  response.cookies.set(CSRF_COOKIE_NAME, cookieValue, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CSRF_COOKIE_MAX_AGE,
    path: "/",
  });
  return response;
}
