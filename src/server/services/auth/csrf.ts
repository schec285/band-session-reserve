/**
 * リクエストの X-CSRF-Token ヘッダーを検証する。
 * トークンが有効であれば true を返す。
 */
export function validateCsrfToken(_request: Request): boolean {
  throw new Error("not implemented");
}

/**
 * CSRFトークンを生成する。
 * 副作用を伴うリクエスト前にクライアントへ発行する。
 */
export function generateCsrfToken(): string {
  throw new Error("not implemented");
}
