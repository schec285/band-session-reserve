import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  generateCsrfCookieValue,
  isValidCsrfToken,
} from "@/lib/auth/csrf";

describe("CSRF_COOKIE_NAME / CSRF_HEADER_NAME", () => {
  it("クッキー名とヘッダー名が定義されている", () => {
    expect(CSRF_COOKIE_NAME).toBe("csrf_token");
    expect(CSRF_HEADER_NAME).toBe("x-csrf-token");
  });
});

describe("generateCsrfCookieValue", () => {
  it("token.hmac 形式の値を生成する", () => {
    const value = generateCsrfCookieValue();
    const parts = value.split(".");

    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatch(/^[0-9a-f]{64}$/);
    expect(parts[1]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("呼び出すたびに異なる値を生成する", () => {
    expect(generateCsrfCookieValue()).not.toBe(generateCsrfCookieValue());
  });
});

describe("isValidCsrfToken", () => {
  it("クッキー値とヘッダー値が一致し署名が正当な場合は true を返す", () => {
    const value = generateCsrfCookieValue();
    expect(isValidCsrfToken(value, value)).toBe(true);
  });

  it("クッキー値とヘッダー値が一致しない場合は false を返す", () => {
    const value = generateCsrfCookieValue();
    const other = generateCsrfCookieValue();
    expect(isValidCsrfToken(value, other)).toBe(false);
  });

  it("クッキー値の署名が改ざんされている場合は false を返す", () => {
    const value = generateCsrfCookieValue();
    const [token] = value.split(".");
    const tampered = `${token}.${"0".repeat(64)}`;
    expect(isValidCsrfToken(tampered, tampered)).toBe(false);
  });

  it("クッキー値が未指定の場合は false を返す", () => {
    expect(isValidCsrfToken(undefined, "some-header-value")).toBe(false);
  });

  it("ヘッダー値が未指定の場合は false を返す", () => {
    const value = generateCsrfCookieValue();
    expect(isValidCsrfToken(value, undefined)).toBe(false);
  });

  it("形式が不正なクッキー値（ドット区切りでない）は false を返す", () => {
    expect(isValidCsrfToken("invalid-format", "invalid-format")).toBe(false);
  });

  it("長さが異なる値を比較しても例外を投げずに false を返す", () => {
    const value = generateCsrfCookieValue();
    expect(() => isValidCsrfToken(value, "short")).not.toThrow();
    expect(isValidCsrfToken(value, "short")).toBe(false);
  });
});
