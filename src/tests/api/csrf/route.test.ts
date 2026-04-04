import { GET } from "@/app/api/csrf/route";

describe("GET /api/csrf", () => {
  it("200: CSRFトークンをJSONとSet-Cookieで返す", async () => {
    const req = new Request("http://localhost/api/csrf");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(typeof json.csrfToken).toBe("string");
    expect(json.csrfToken.length).toBeGreaterThan(0);

    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).toContain(`csrf=${json.csrfToken}`);
  });
});
