const IFRAME_SRC_PATTERN = /<iframe[^>]*\ssrc=["']([^"']+)["']/i;
const ALLOWED_HOSTNAME = "www.google.com";
const ALLOWED_PATH_PREFIX = "/maps/embed";

/**
 * Google マップの埋め込み用 HTML（<iframe> タグ）または URL から、
 * 安全な埋め込み URL のみを抽出・検証して返す。
 * 入力に <iframe> タグが含まれる場合は src 属性の値を抽出し、
 * 含まれない場合は入力全体を URL 候補として扱う。
 * https://www.google.com/maps/embed から始まる URL 以外は null を返す。
 */
export function extractGoogleMapsEmbedUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const iframeMatch = trimmed.match(IFRAME_SRC_PATTERN);
  const candidate = iframeMatch ? iframeMatch[1] : trimmed;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  if (url.hostname !== ALLOWED_HOSTNAME) return null;
  if (!url.pathname.startsWith(ALLOWED_PATH_PREFIX)) return null;

  return url.toString();
}
