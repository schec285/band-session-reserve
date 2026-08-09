import { buildHtml } from "@/server/services/email/html";

describe("buildHtml", () => {
  describe("正常系", () => {
    it("<!DOCTYPE html>で始まるHTMLドキュメントを返す", () => {
      const html = buildHtml("<p>本文</p>");
      expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    });

    it("日本語設定(lang=\"ja\")のhtmlタグを含む", () => {
      const html = buildHtml("<p>本文</p>");
      expect(html).toContain('<html lang="ja">');
    });

    it("UTF-8のcharset metaタグを含む", () => {
      const html = buildHtml("<p>本文</p>");
      expect(html).toContain('<meta charset="UTF-8" />');
    });

    it("レスポンシブ対応のviewport metaタグを含む", () => {
      const html = buildHtml("<p>本文</p>");
      expect(html).toContain(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />'
      );
    });

    it("渡したbodyの内容がそのまま<body>タグ内に含まれる", () => {
      const body = "<p>予約が完了しました。</p>";
      const html = buildHtml(body);
      expect(html).toContain(`<body>\n${body}\n</body>`);
    });

    it("空文字列を渡した場合も正しくラップされる", () => {
      const html = buildHtml("");
      expect(html).toContain("<body>\n\n</body>");
      expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    });

    it("bodyに含まれるHTMLタグはエスケープされずそのまま出力される", () => {
      const body = '<p>テスト<strong>強調</strong></p>';
      const html = buildHtml(body);
      expect(html).toContain(body);
    });
  });
});
