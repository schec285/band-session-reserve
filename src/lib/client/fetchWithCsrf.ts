import { CSRF_HEADER_NAME } from "@/lib/auth/csrf-constants";
import { getCsrfToken } from "@/lib/client/csrf";

/**
 * CSRF トークンを自動付与する fetch のラッパー。
 * CSRFトークンが不正で403（X-CSRF-Error ヘッダー付き）が返った場合のみ、
 * /api/csrf でトークンを再取得したうえで元のリクエストを1回だけ再送する。
 * リトライ時は init.body をそのまま再送するため、body は文字列など再利用可能な値である必要がある。
 */
export async function fetchWithCsrf(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const send = () => {
    const headers = new Headers(init.headers);
    const token = getCsrfToken();
    if (token) headers.set(CSRF_HEADER_NAME, token);
    return fetch(input, { ...init, headers });
  };

  const response = await send();

  if (response.status === 403 && response.headers.get("X-CSRF-Error") === "1") {
    await fetch("/api/csrf");
    return send();
  }

  return response;
}
