import { randomUUID } from "crypto";

/**
 * CSRFトークンを生成する。
 * セッション発行と同タイミングで呼び出し、csrf Cookie（HttpOnly: false）にセットする。
 */
export function generateCsrfToken(): string {
  return randomUUID();
}

/**
 * Double Submit Cookie パターンで CSRFトークンを検証する。
 * X-CSRF-Token ヘッダーと csrf Cookie の値が一致すれば true を返す。
 */
export function validateCsrfToken(request: Request): boolean {
  const header = request.headers.get("X-CSRF-Token");
  if (!header) return false;

  const cookie = request.headers.get("Cookie");
  if (!cookie) return false;

  const match = cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
  if (!match) return false;

  return header === match[1];
}
