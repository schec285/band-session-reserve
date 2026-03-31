# API 設計書

バンドセッション予約システムの API 仕様。

---

## エンドポイント一覧

| メソッド | パス | 概要 | 認証要否 |
|---|---|---|---|
| POST | `/api/auth/register` | ユーザー登録 | 不要 |
| POST | `/api/auth/login` | ログイン（セッションクッキー発行） | 不要 |
| POST | `/api/auth/logout` | ログアウト（セッションクッキー削除） | 要 |
| POST | `/api/reserve` | セッション予約を受け付ける | 要 |
| PATCH | `/api/reserve/:reservationId` | 予約のパートを部分変更する | 要 |
| DELETE | `/api/reserve/:reservationId` | 予約をキャンセルする | 要 |

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

## POST `/api/auth/register`

### 概要

新規ユーザーを登録する。

### リクエスト

**Content-Type**: `application/json`

#### ボディ

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `username` | string | ✓ | ユーザー名（表示名） |
| `email` | string | ✓ | メールアドレス |
| `password` | string | ✓ | パスワード |

#### リクエスト例

```json
{
  "username": "山田太郎",
  "email": "yamada@example.com",
  "password": "p@ssw0rd"
}
```

### レスポンス

#### 201 Created — 登録成功

```json
{
  "success": true,
  "message": "ユーザー登録が完了しました"
}
```

#### 400 Bad Request — バリデーションエラー

| 条件 | `message` |
|---|---|
| `username` が空 | `"ユーザー名は必須です"` |
| `email` が不正 | `"メールアドレスの形式が不正です"` |
| `password` が空 | `"パスワードは必須です"` |
| メールアドレスが既に登録済み | `"このメールアドレスは既に使用されています"` |

---

## POST `/api/auth/login`

### 概要

認証情報を検証し、セッションクッキーと API トークンを発行する。

### リクエスト

**Content-Type**: `application/json`

#### ボディ

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `email` | string | ✓ | 登録済みメールアドレス |
| `password` | string | ✓ | パスワード |

#### リクエスト例

```json
{
  "email": "yamada@example.com",
  "password": "p@ssw0rd"
}
```

### レスポンス

#### 200 OK — ログイン成功

**レスポンスヘッダー**:

```
Set-Cookie: session=<session_token>; HttpOnly; Secure; SameSite=Strict; Path=/
```

**レスポンスボディ**:

```json
{
  "success": true,
  "message": "ログインしました",
  "token": "<api_token>"
}
```

> `token` はクライアントが保持し、以降のリクエストの `Authorization` ヘッダーで使用する。

#### 401 Unauthorized — 認証失敗

```json
{
  "success": false,
  "message": "メールアドレスまたはパスワードが正しくありません"
}
```

---

## POST `/api/auth/logout`

### 概要

セッションクッキーを無効化する。

### リクエストヘッダー

```
Cookie: session=<session_token>
Authorization: Bearer <api_token>
```

### レスポンス

#### 200 OK

**レスポンスヘッダー**:

```
Set-Cookie: session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0
```

```json
{
  "success": true,
  "message": "ログアウトしました"
}
```

---

## POST `/api/reserve`

### 概要

バンドセッションの予約を受け付ける。ユーザー識別はクッキー認証で行うため、`name` はリクエストボディに含めない。サーバーサイドでバリデーションを行い、現時点ではコンソールへログ出力する（DB 保存なし）。

### リクエストヘッダー

```
Cookie: session=<session_token>
Authorization: Bearer <api_token>
Content-Type: application/json
```

### リクエストボディ

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `songId` | string | ✓ | 予約対象曲の UUID（イベントに紐づく） |
| `parts` | string[] | ✓ | 担当パートの配列（1つ以上、下記の許可値のいずれか） |
| `snsConsent` | boolean | ✓ | SNS 配信による顔出し同意（`true`: 同意 / `false`: 不同意） |
| `comment` | string | - | 備考・コメント（任意） |

> `eventId` はリクエストボディに含めない。`songId` はイベントに紐づいているため、サーバー側で `songId` からイベントを特定する。

#### `parts` の許可値

| 値 | 表示名 | 同一曲での上限 |
|---|---|---|
| `readGuitar` | リードギター | 1人 |
| `backingGuitar` | バッキングギター | 1人 |
| `bass` | ベース | 1人 |
| `drums` | ドラム | 1人 |
| `keyboard` | キーボード | 1人 |
| `vocal` | ボーカル | 上限なし |
| `other` | その他 | 上限なし |

#### リクエスト例

```json
{
  "songId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "parts": ["vocal", "readGuitar"],
  "snsConsent": true,
  "comment": "ボーカル兼ギターで参加します。"
}
```

### レスポンス

#### 共通レスポンス型

```typescript
interface ApiResponse {
  success: boolean;
  message: string;
}
```

#### 200 OK — 予約成功

```json
{
  "success": true,
  "message": "予約を受け付けました！セッションでお待ちしています 🎵"
}
```

#### 400 Bad Request — バリデーションエラー

| 条件 | `message` |
|---|---|
| `songId` が空または存在しない値 | `"曲IDが不正です"` |
| `parts` が空配列または未指定 | `"パートは1つ以上指定してください"` |
| `parts` に不正値が含まれる | `"パートが不正です"` |
| `snsConsent` が boolean でない | `"SNS同意の値が不正です"` |

```json
{
  "success": false,
  "message": "曲IDが不正です"
}
```

#### 401 Unauthorized — 未認証

```json
{
  "success": false,
  "message": "認証が必要です"
}
```

#### 409 Conflict — パートが埋まっている

```json
{
  "success": false,
  "message": "このパートはすでに埋まっています"
}
```

#### 405 Method Not Allowed — POST 以外のメソッド

```json
{
  "success": false,
  "message": "Method Not Allowed"
}
```

#### 500 Internal Server Error — サーバーエラー

```json
{
  "success": false,
  "message": "サーバーエラーが発生しました。しばらく後にお試しください。"
}
```

---

## PATCH `/api/reserve/:reservationId`

### 概要

予約済みのパートを部分変更する。`parts` の配列を上書きする形で更新する。

### リクエストヘッダー

```
Cookie: session=<session_token>
Authorization: Bearer <api_token>
Content-Type: application/json
```

### パスパラメーター

| パラメーター | 型 | 説明 |
|---|---|---|
| `reservationId` | string | 変更対象の予約 UUID |

### リクエストボディ

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `parts` | string[] | ✓ | 変更後のパート配列（1つ以上） |

#### リクエスト例

```json
{
  "parts": ["vocal"]
}
```

### レスポンス

#### 200 OK — 更新成功

```json
{
  "success": true,
  "message": "予約を更新しました"
}
```

#### 400 Bad Request — バリデーションエラー

| 条件 | `message` |
|---|---|
| `parts` が空配列または未指定 | `"パートは1つ以上指定してください"` |
| `parts` に不正値が含まれる | `"パートが不正です"` |

#### 401 Unauthorized — 未認証

```json
{
  "success": false,
  "message": "認証が必要です"
}
```

#### 403 Forbidden — 他ユーザーの予約を操作しようとした

```json
{
  "success": false,
  "message": "この操作は許可されていません"
}
```

#### 404 Not Found — 予約が存在しない

```json
{
  "success": false,
  "message": "予約が見つかりません"
}
```

#### 409 Conflict — 変更後のパートが埋まっている

```json
{
  "success": false,
  "message": "このパートはすでに埋まっています"
}
```

---

## DELETE `/api/reserve/:reservationId`

### 概要

予約をキャンセルする（予約レコードごと削除）。

### リクエストヘッダー

```
Cookie: session=<session_token>
Authorization: Bearer <api_token>
```

### パスパラメーター

| パラメーター | 型 | 説明 |
|---|---|---|
| `reservationId` | string | キャンセル対象の予約 UUID |

### レスポンス

#### 200 OK — キャンセル成功

```json
{
  "success": true,
  "message": "予約をキャンセルしました"
}
```

#### 401 Unauthorized — 未認証

```json
{
  "success": false,
  "message": "認証が必要です"
}
```

#### 403 Forbidden — 他ユーザーの予約を操作しようとした

```json
{
  "success": false,
  "message": "この操作は許可されていません"
}
```

#### 404 Not Found — 予約が存在しない

```json
{
  "success": false,
  "message": "予約が見つかりません"
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
| パート埋まりチェック（DB照合） | - | ✓ | POST / PATCH |
| `snsConsent` boolean チェック | ✓ | ✓ | POST |
| `reservationId` 存在チェック（DB照合） | - | ✓ | PATCH / DELETE |
| 予約の所有者チェック | - | ✓ | PATCH / DELETE |
| セッションクッキー有効性 | - | ✓ | 全エンドポイント |
| API トークン有効性 | - | ✓ | 全エンドポイント |

---

## 現在の制約・今後の拡張ポイント

- **永続化なし**: 予約データは `console.log` のみ。DB 設計は `docs/db-design.md` を参照。
- **イベント・曲管理 API なし**: `songId` の存在チェックには別途イベント・曲一覧 API が必要。
- **セッションストアなし**: セッションの永続化・無効化には Redis 等のストアが必要。
