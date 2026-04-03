import { generateCsrfToken, validateCsrfToken } from "@/server/services/csrf/csrf";

function makeRequest(csrfHeader?: string, csrfCookie?: string) {
  const headers: Record<string, string> = {};
  if (csrfHeader !== undefined) headers["X-CSRF-Token"] = csrfHeader;
  if (csrfCookie !== undefined) headers["Cookie"] = `csrf=${csrfCookie}`;
  return new Request("http://localhost/", { headers });
}

describe("generateCsrfToken", () => {
  it("文字列を返す", () => {
    const token = generateCsrfToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("呼び出すたびに異なる値を返す", () => {
    const token1 = generateCsrfToken();
    const token2 = generateCsrfToken();
    expect(token1).not.toBe(token2);
  });
});

describe("validateCsrfToken", () => {
  it("ヘッダーと Cookie が一致する場合は true を返す", () => {
    const token = "valid-token";
    expect(validateCsrfToken(makeRequest(token, token))).toBe(true);
  });

  it("ヘッダーと Cookie が一致しない場合は false を返す", () => {
    expect(validateCsrfToken(makeRequest("header-token", "cookie-token"))).toBe(false);
  });

  it("X-CSRF-Token ヘッダーがない場合は false を返す", () => {
    expect(validateCsrfToken(makeRequest(undefined, "valid-token"))).toBe(false);
  });

  it("csrf Cookie がない場合は false を返す", () => {
    expect(validateCsrfToken(makeRequest("valid-token", undefined))).toBe(false);
  });
});
