# API 設計書 — CSRF (`/api/csrf`)

> エラーレスポンスの共通形式は [shared.md](./shared.md) を参照。

---

## GET `/api/csrf`

### 概要

副作用を伴うリクエスト（POST / PATCH / DELETE）に必要な CSRFトークンを発行する。認証不要で誰でも取得できる。ログイン成功後は、レスポンスに含まれる新しい CSRFトークンに更新すること。

### レスポンス

#### 200 OK

```json
{
  "csrfToken": "<csrf_token>"
}
```

> CSRFトークンはクライアントが保持し、副作用を伴うすべてのリクエストの `X-CSRF-Token` ヘッダーに含めて送信する。
