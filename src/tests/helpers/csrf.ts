import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, generateCsrfCookieValue } from "@/lib/auth/csrf";

/**
 * テスト用に有効な CSRF クッキーヘッダー値とリクエストヘッダー値のペアを生成する。
 */
export function makeCsrfPair() {
  const value = generateCsrfCookieValue();
  return {
    cookieHeader: `${CSRF_COOKIE_NAME}=${value}`,
    headers: { [CSRF_HEADER_NAME]: value },
  };
}
