/**
 * メール本文を日本語設定のHTMLドキュメントでラップする。
 */
export function buildHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body>
${body}
</body>
</html>`;
}
