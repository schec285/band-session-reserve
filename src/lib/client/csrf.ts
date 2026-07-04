import { CSRF_COOKIE_NAME } from "@/lib/auth/csrf-constants";

/**
 * document.cookie から CSRF トークンを取得する。
 * クッキーが存在しない場合は null を返す。
 */
export function getCsrfToken(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
