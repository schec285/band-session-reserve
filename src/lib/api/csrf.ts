import { NextResponse } from "next/server";
import type { ErrorResponse } from "@/lib/types/api";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, isValidCsrfToken } from "@/lib/auth/csrf";

/**
 * リクエストの Cookie ヘッダーから指定した名前の値を取得する。
 */
function getCookieValue(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

/**
 * リクエストの CSRF トークン（二重送信Cookie方式）を検証する。
 * 不正な場合は X-CSRF-Error ヘッダー付きの 403 レスポンスを返し、正当な場合は null を返す。
 */
export function verifyCsrfToken(request: Request): NextResponse<ErrorResponse> | null {
  const cookieValue = getCookieValue(request, CSRF_COOKIE_NAME);
  const headerValue = request.headers.get(CSRF_HEADER_NAME) ?? undefined;

  if (!isValidCsrfToken(cookieValue, headerValue)) {
    const response = NextResponse.json(
      { message: "CSRFトークンが不正です" } satisfies ErrorResponse,
      { status: 403 }
    );
    response.headers.set("X-CSRF-Error", "1");
    return response;
  }

  return null;
}
