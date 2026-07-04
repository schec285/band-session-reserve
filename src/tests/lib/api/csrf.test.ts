import { verifyCsrfToken } from "@/lib/api/csrf";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, generateCsrfCookieValue } from "@/lib/auth/csrf";

function makeRequest(cookieValue?: string, headerValue?: string) {
  const headers = new Headers();
  if (cookieValue) headers.set("cookie", `${CSRF_COOKIE_NAME}=${cookieValue}`);
  if (headerValue) headers.set(CSRF_HEADER_NAME, headerValue);
  return new Request("http://localhost/api/example", { method: "POST", headers });
}

describe("verifyCsrfToken", () => {
  it("クッキー値とヘッダー値が正当な場合は null を返す", () => {
    const value = generateCsrfCookieValue();
    expect(verifyCsrfToken(makeRequest(value, value))).toBeNull();
  });

  it("トークンが不正な場合は 403 と X-CSRF-Error ヘッダーを返す", async () => {
    const result = verifyCsrfToken(makeRequest("invalid", "invalid"));

    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    expect(result!.headers.get("X-CSRF-Error")).toBe("1");

    const json = await result!.json();
    expect(json.message).toBeTruthy();
  });

  it("クッキーが無い場合は 403 を返す", () => {
    const value = generateCsrfCookieValue();
    const result = verifyCsrfToken(makeRequest(undefined, value));
    expect(result!.status).toBe(403);
  });

  it("ヘッダーが無い場合は 403 を返す", () => {
    const value = generateCsrfCookieValue();
    const result = verifyCsrfToken(makeRequest(value, undefined));
    expect(result!.status).toBe(403);
  });

  it("他のクッキーと同居していても csrf_token を正しく抽出できる", () => {
    const value = generateCsrfCookieValue();
    const headers = new Headers();
    headers.set("cookie", `authjs.session-token=abc; ${CSRF_COOKIE_NAME}=${value}; other=xyz`);
    headers.set(CSRF_HEADER_NAME, value);
    const request = new Request("http://localhost/api/example", { method: "POST", headers });

    expect(verifyCsrfToken(request)).toBeNull();
  });
});
