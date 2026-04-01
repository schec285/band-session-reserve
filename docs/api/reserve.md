# API 設計書 — 予約 (`/api/reserve`)

---

## エンドポイント一覧

| メソッド | パス | 概要 | 認証要否 |
|---|---|---|---|
| POST | [`/api/reserve`](#post-apireserve) | セッション予約を受け付ける | 要 |
| PATCH | [`/api/reserve/:reservationId`](#patch-apireservereservationid) | 予約のパートを部分変更する | 要 |
| DELETE | [`/api/reserve/:reservationId`](#delete-apireservereservationid) | 予約をキャンセルする | 要 |

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

#### 405 Method Not Allowed — POST 以外のメソッド

```json
{
  "success": false,
  "message": "Method Not Allowed"
}
```

#### 409 Conflict — 受付終了

```json
{
  "success": false,
  "message": "このイベントの受付は終了しています"
}
```

#### 409 Conflict — パートが埋まっている

```json
{
  "success": false,
  "message": "このパートはすでに埋まっています"
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

#### 409 Conflict — 受付終了

```json
{
  "success": false,
  "message": "このイベントの受付は終了しています"
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

#### 409 Conflict — 受付終了

```json
{
  "success": false,
  "message": "このイベントの受付は終了しています"
}
```
