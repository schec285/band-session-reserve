# API 設計書 — 概要

バンドセッション予約システムの API 仕様概要。

---

## エンドポイント一覧

| メソッド | パス | 概要 | 認証要否 |
|---|---|---|---|
| GET | `/api/events` | イベント一覧を取得する | 不要 |
| GET | `/api/events/:eventId/songs` | イベントの曲一覧と予約状況を取得する | 不要 |
| GET | `/api/auth/challenge` | 認証用チャレンジを取得する | 不要 |
| POST | `/api/auth/register` | ユーザー登録（確認メール送信） | 不要 |
| POST | `/api/auth/verify-email` | 認証コード + チャレンジ検証・アカウント有効化 | 不要 |
| POST | `/api/auth/login` | ログイン（セッションクッキー発行） | 不要 |
| POST | `/api/auth/logout` | ログアウト（セッションクッキー削除） | 要 |
| POST | `/api/reserve` | セッション予約を受け付ける | 要 |
| PATCH | `/api/reserve/:reservationId` | 予約のパートを部分変更する | 要 |
| DELETE | `/api/reserve/:reservationId` | 予約をキャンセルする | 要 |

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

## 現在の制約・今後の拡張ポイント

- **永続化なし**: 予約データは `console.log` のみ。DB 設計は `docs/db-design.md` を参照。
- **イベント・曲データは静的**: 現状 `GET /api/events` はハードコードされたデータを返す。
- **セッションストアなし**: セッションの永続化・無効化には Redis 等のストアが必要。
