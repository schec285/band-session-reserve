import crypto from "crypto";

if (!process.env.HMAC_SECRET) throw new Error("HMAC_SECRET environment variable is not set");
const SECRET: string = process.env.HMAC_SECRET;

/**
 * HMAC-SHA256 署名を生成する。
 */
function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

/**
 * メール認証クッキーの値を生成する。
 * フォーマット: `{emailHash}.{tokenId}.{expiresAt}.{hmac}`
 */
export function createVerifyCookieValue(emailHash: string, tokenId: string, expiresAt: number): string {
  const payload = `${emailHash}.${tokenId}.${expiresAt}`;
  const hmac = sign(payload);
  return `${payload}.${hmac}`;
}

/**
 * メール認証クッキーの値を検証してペイロードを返す。
 * 改ざん・期限切れの場合は null を返す。
 */
export function parseVerifyCookie(cookieValue: string): {
  emailHash: string;
  tokenId: string;
} | null {
  const parts = cookieValue.split(".");
  if (parts.length !== 4) return null;

  const [emailHash, tokenId, expiresAtStr, hmac] = parts;
  const payload = `${emailHash}.${tokenId}.${expiresAtStr}`;

  const expected = sign(payload);
  const hmacBuf = Buffer.from(hmac, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (hmacBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(hmacBuf, expectedBuf)) return null;

  if (Date.now() > Number(expiresAtStr)) return null;

  return { emailHash, tokenId };
}
