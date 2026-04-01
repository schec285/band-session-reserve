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

ログイン成功時にサーバーがセッションクッキーを発行する。以降のリクエストはこのクッキーを自動送信することでユーザーを識別する。

```
Cookie: session=<session_token>
```

- `HttpOnly`: true（JavaScript からアクセス不可）
- `Secure`: true（HTTPS のみ）
- `SameSite`: `Strict`

### トークン認証（API トークン）

認証が必要なエンドポイントは、リクエストヘッダーに API トークンを含める。

```
Authorization: Bearer <api_token>
```

- ログイン時にセッションクッキーとあわせて発行する
- クッキー認証とトークン認証の両方が揃っている場合のみ受け付ける（二重認証）

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
| API トークン有効性 | - | ✓ | 全エンドポイント |

---
