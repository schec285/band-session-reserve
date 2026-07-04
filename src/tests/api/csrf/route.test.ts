import { GET } from "@/app/api/csrf/route";
import { CSRF_COOKIE_NAME } from "@/lib/auth/csrf";

describe("GET /api/csrf", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("200: csrf_token クッキーを発行する", async () => {
    const res = await GET();
    const setCookie = res.headers.get("set-cookie") ?? "";

    expect(res.status).toBe(200);
    expect(setCookie).toMatch(new RegExp(`${CSRF_COOKIE_NAME}=`));
    expect(setCookie).toMatch(/Path=\//i);
    expect(setCookie).toMatch(/SameSite=lax/i);
    expect(setCookie).toMatch(/Max-Age=86400/i);
  });

  it("開発環境では Secure 属性を付与しない", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = await GET();
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).not.toMatch(/Secure/i);
  });

  it("本番環境では Secure 属性を付与する", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await GET();
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/Secure/i);
  });
});
