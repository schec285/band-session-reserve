import { generateCsrfToken, validateCsrfToken } from "@/server/services/auth/csrf";

function makeRequest(csrfToken?: string) {
  const headers: Record<string, string> = {};
  if (csrfToken !== undefined) {
    headers["X-CSRF-Token"] = csrfToken;
  }
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
  it("有効なトークンは true を返す", () => {
    const token = generateCsrfToken();
    expect(validateCsrfToken(makeRequest(token))).toBe(true);
  });

  it("不正なトークンは false を返す", () => {
    expect(validateCsrfToken(makeRequest("invalid-token"))).toBe(false);
  });

  it("X-CSRF-Token ヘッダーがない場合は false を返す", () => {
    expect(validateCsrfToken(makeRequest())).toBe(false);
  });
});
