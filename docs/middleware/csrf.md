# CSRF 保護設計書

## 概要

Double Submit Cookie パターンで CSRF 保護を実装する。`/api/csrf` エンドポイントは存在しない。

---

## クッキー発行

ミドルウェア（`middleware.ts`）がすべてのリクエストを処理し、`csrf` クッキーが未発行の場合に自動でセットする。

| 属性 | 値 |
|------|-----|
| 名前 | `csrf` |
| 値 | 32バイトのランダムバイト列（hex エンコード、64文字） |
| Secure | ✓ |
| SameSite | Strict |
| HttpOnly | なし（JS から読み取り可能） |

---

## クライアント実装

副作用を伴うリクエスト（POST / PATCH / DELETE）を送信する前に、JS で `csrf` クッキーの値を読み取り `X-CSRF-Token` ヘッダーに付与する。

```js
const csrfToken = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/)?.[1];

fetch("/api/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-CSRF-Token": csrfToken,
  },
  body: JSON.stringify({ email, password }),
});
```

---

## サーバー検証

すべての副作用エンドポイントで `validateCsrfToken(request)` を呼び出す。`X-CSRF-Token` ヘッダーと `csrf` クッキーの値が一致しない場合は `403` を返す。
