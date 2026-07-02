import { extractGoogleMapsEmbedUrl } from "@/lib/utils/googleMapsEmbed";

const VALID_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1234!2d139.0!3d35.0";

describe("extractGoogleMapsEmbedUrl", () => {
  describe("正常系", () => {
    it("iframe タグから src の URL を抽出する", () => {
      const html = `<iframe src="${VALID_EMBED_URL}" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>`;
      expect(extractGoogleMapsEmbedUrl(html)).toBe(VALID_EMBED_URL);
    });

    it("属性の順序が src より前でも抽出できる", () => {
      const html = `<iframe width="600" height="450" src="${VALID_EMBED_URL}"></iframe>`;
      expect(extractGoogleMapsEmbedUrl(html)).toBe(VALID_EMBED_URL);
    });

    it("URL のみが渡された場合はそのまま検証して返す", () => {
      expect(extractGoogleMapsEmbedUrl(VALID_EMBED_URL)).toBe(VALID_EMBED_URL);
    });

    it("前後の空白を除去する", () => {
      expect(extractGoogleMapsEmbedUrl(`  ${VALID_EMBED_URL}  `)).toBe(VALID_EMBED_URL);
    });
  });

  describe("異常系", () => {
    it("http（非TLS）は拒否する", () => {
      const html = `<iframe src="http://www.google.com/maps/embed?pb=1"></iframe>`;
      expect(extractGoogleMapsEmbedUrl(html)).toBeNull();
    });

    it("hostname が google.com でない場合は拒否する（オープンリダイレクト風）", () => {
      const html = `<iframe src="https://evil.com/maps/embed?pb=1"></iframe>`;
      expect(extractGoogleMapsEmbedUrl(html)).toBeNull();
    });

    it("hostname 詐称（サブドメイン偽装）は拒否する", () => {
      const html = `<iframe src="https://www.google.com.evil.com/maps/embed?pb=1"></iframe>`;
      expect(extractGoogleMapsEmbedUrl(html)).toBeNull();
    });

    it("pathname が /maps/embed で始まらない場合は拒否する", () => {
      const html = `<iframe src="https://www.google.com/search?q=1"></iframe>`;
      expect(extractGoogleMapsEmbedUrl(html)).toBeNull();
    });

    it("javascript: スキームは拒否する", () => {
      const html = `<iframe src="javascript:alert(1)"></iframe>`;
      expect(extractGoogleMapsEmbedUrl(html)).toBeNull();
    });

    it("src を持たない iframe は拒否する", () => {
      const html = `<iframe width="600" height="450"></iframe>`;
      expect(extractGoogleMapsEmbedUrl(html)).toBeNull();
    });

    it("script タグが混ざっていても src の URL 自体が不正なら拒否する", () => {
      const html = `<script>alert(1)</script><iframe src="javascript:alert(1)"></iframe>`;
      expect(extractGoogleMapsEmbedUrl(html)).toBeNull();
    });

    it("不正な URL 文字列は拒否する", () => {
      expect(extractGoogleMapsEmbedUrl("not a url")).toBeNull();
    });

    it("空文字は拒否する", () => {
      expect(extractGoogleMapsEmbedUrl("")).toBeNull();
    });
  });
});
