import { GET } from "../route";

describe("GET /api/auth/csrf", () => {
  it("CSRFトークンを返す", async () => {
    const req = new Request("http://localhost/api/auth/csrf");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(typeof json.csrfToken).toBe("string");
    expect(json.csrfToken.length).toBeGreaterThan(0);
  });
});
