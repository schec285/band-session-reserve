# API 設計書 — 概要

バンドセッション予約システムの API 仕様概要。

---

詳細仕様:
- [イベント API](./events.md)
- [認証 API](./auth.md)
- [予約 API](./reserve.md)

---

## 認証方式

### クッキー認証（セッション）

初回アクセスとログイン成功時にサーバーがセッションクッキーを発行する。以降のリクエストはこのクッキーを自動送信することでユーザーを識別する。

```
Cookie: session=<session_token>
```

- `HttpOnly`: true（JavaScript からアクセス不可）
- `Secure`: true（HTTPS のみ）
- `SameSite`: `Strict`

### CSRF トークン

初回アクセスとログイン成功時に`GET /api/auth/csrf`で取得する。副作用を伴うすべてのリクエスト（POST / PATCH / DELETE）は、取得した CSRFトークンをヘッダーに含める。

```
X-CSRF-Token: <csrf_token>
```

- セッション確立前（登録・ログインなど）も必須
- トークンが無効・未送信の場合は **403 Forbidden** を返す

```json
{
  "success": false,
  "message": "CSRFトークンが無効です"
}
```

---

## 共通エラーレスポンス

### 401 Unauthorized — 未認証

認証が必要なエンドポイントに対して、セッションが未確立または無効な状態でリクエストした場合に返す。

```json
{
  "success": false,
  "message": "認証が必要です"
}
```

---

## バリデーション仕様

バリデーションはクライアント（`components/ReserveForm.tsx`）とサーバー（`app/api/reserve/route.ts`）の両方で実施する（意図的な二重実装）。

| チェック項目 | クライアント | サーバー | 対象エンドポイント |
|---|---|---|---|
| `songId` 必須チェック | ✓ | ✓ | POST |
| `songId` 存在チェック（DB照合） | - | ✓ | POST |
| `parts` 1件以上チェック | ✓ | ✓ | POST / PATCH |
| `parts` 許可値チェック | ✓ | ✓ | POST / PATCH |
| 受付締め切りチェック（`closedAt ?? startAt` <= 現在時刻） | - | ✓ | POST / PATCH / DELETE |
| パート埋まりチェック（DB照合） | - | ✓ | POST / PATCH |
| `snsConsent` boolean チェック | ✓ | ✓ | POST |
| `reservationId` 存在チェック（DB照合） | - | ✓ | PATCH / DELETE |
| 予約の所有者チェック | - | ✓ | PATCH / DELETE |
| メールアドレス認証済みチェック | - | ✓ | login |
| メール検証トークン有効性チェック | - | ✓ | verify-email |
| セッションクッキー有効性 | - | ✓ | 全エンドポイント |
| CSRFトークン有効性 | - | ✓ | POST / PATCH / DELETE 全エンドポイント |

---
