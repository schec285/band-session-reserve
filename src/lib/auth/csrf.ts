import crypto from "crypto";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/auth/csrf-constants";

if (!process.env.HMAC_SECRET) throw new Error("HMAC_SECRET environment variable is not set");
const SECRET: string = process.env.HMAC_SECRET;

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
export const CSRF_COOKIE_MAX_AGE = 60 * 60 * 24; // 1日（秒）

/**
 * HMAC-SHA256 署名を生成する。
 */
function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

/**
 * 長さが異なるバッファを比較しても例外を投げない安全な比較を行う。
 * crypto.timingSafeEqual は長さが異なるバッファに対して例外を投げるため、
 * 事前に長さチェックを行ってから呼び出す。
 */
function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * CSRF トークンクッキーの値を新規生成する。
 * フォーマット: `{randomToken}.{hmac}`
 */
export function generateCsrfCookieValue(): string {
  const token = crypto.randomBytes(32).toString("hex");
  return `${token}.${sign(token)}`;
}

/**
 * クッキー値の署名を検証する。
 * 改ざんされている、または形式が不正な場合は false を返す。
 */
function isValidCookieValue(cookieValue: string): boolean {
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return false;

  const [token, hmac] = parts;
  const expected = sign(token);

  return safeEqual(Buffer.from(hmac, "hex"), Buffer.from(expected, "hex"));
}

/**
 * クッキー値とヘッダー値を突き合わせて CSRF トークンを検証する（二重送信Cookie方式）。
 * クッキーの署名が不正、またはクッキー値とヘッダー値が一致しない場合は false を返す。
 */
export function isValidCsrfToken(
  cookieValue: string | undefined,
  headerValue: string | undefined
): boolean {
  if (!cookieValue || !headerValue) return false;
  if (!isValidCookieValue(cookieValue)) return false;

  return safeEqual(Buffer.from(cookieValue, "utf8"), Buffer.from(headerValue, "utf8"));
}
