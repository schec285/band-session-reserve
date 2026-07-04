# API 設計書 — 予約 (`/api/reserve`)

---

## エンドポイント一覧

| メソッド | パス | 概要 | 認証要否 |
|---|---|---|---|
| POST | [`/api/reserve`](#post-apireserve) | セッション予約を受け付ける | 要 |
| PUT | [`/api/reserve/:reservationId`](#put-apireservereservationid) | 予約の譲渡可否を変更する | 要 |
| DELETE | [`/api/reserve/:reservationId`](#delete-apireservereservationid) | 予約をキャンセルする | 要 |

---

## POST `/api/reserve`

### 概要

バンドセッションの予約を受け付ける。

### リクエストヘッダー

```
Cookie: session=<session_token>
X-CSRF-Token: <csrf_token>
Content-Type: application/json
```

### リクエストボディ

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `eventSongId` | string | ✓ | 予約対象のイベント曲 UUID（`event_songs` のID） |
| `part` | string | ✓ | 担当パート |
| `snsConsent` | boolean | ✓ | SNS 配信による顔出し同意（`true`: 同意 / `false`: 不同意） |
| `comment` | string | - | 備考・コメント（任意） |

#### リクエスト例

```json
{
  "eventSongId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "part": "vocal",
  "snsConsent": true,
  "comment": "よろしくお願いします。"
}
```

### レスポンス

#### 200 OK — 予約成功

```json
{
  "message": "予約を受け付けました！セッションでお待ちしています 🎵"
}
```

#### 400 Bad Request — バリデーションエラー

| 条件 | `message` |
|---|---|
| `eventSongId` が空または UUID 形式でない | `"イベント曲IDが不正です"` |
| `part` が未指定または不正値 | `"入力内容に誤りがあります"` |
| `snsConsent` が未指定または不正値 | `"入力内容に誤りがあります"` |

```json
{
  "message": "イベント曲IDが不正です"
}
```

```json
{
  "message": "入力内容に誤りがあります",
  "errors": [
    { "field": "part", "message": "パートを選択してください" },
    { "field": "snsConsent", "message": "選択してください" }
  ]
}
```

#### 401 Unauthorized — 未認証

> [共通仕様](./shared.md#401-unauthorized--未認証) を参照。

#### 403 Forbidden — CSRFトークン不正

> [共通仕様](./shared.md#403-forbidden--csrfトークン不正) を参照。

#### 404 Not Found — イベント曲が存在しない

```json
{
  "message": "イベント曲が見つかりません"
}
```

#### 409 Conflict — パートが埋まっている

```json
{
  "message": "このパートはすでに埋まっています",
  "errors": [
    { "field": "part", "message": "このパートはすでに埋まっています" }
  ]
}
```

#### 422 Unprocessable Entity — 受付終了

```json
{
  "message": "このイベントの受付は終了しています"
}
```


---

## PUT `/api/reserve/:reservationId`

### 概要

予約の譲渡可否を変更する。

### リクエストヘッダー

```
Cookie: session=<session_token>
X-CSRF-Token: <csrf_token>
Content-Type: application/json
```

### パスパラメーター

| パラメーター | 型 | 説明 |
|---|---|---|
| `reservationId` | string | 変更対象の予約 UUID |

### リクエストボディ

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `isTransferable` | boolean | ✓ | 譲渡可否（`true`: 譲渡可能 / `false`: 譲渡不可） |

#### リクエスト例

```json
{
  "isTransferable": true
}
```

### レスポンス

#### 200 OK — 更新成功

```json
{
  "message": "予約を更新しました"
}
```

#### 400 Bad Request — バリデーションエラー

| 条件 | `message` |
|---|---|
| `isTransferable` が未指定または不正値 | `"入力内容に誤りがあります"` |

```json
{
  "message": "入力内容に誤りがあります",
  "errors": [
    { "field": "isTransferable", "message": "選択してください" }
  ]
}
```

#### 401 Unauthorized — 未認証

> [共通仕様](./shared.md#401-unauthorized--未認証) を参照。

#### 403 Forbidden — CSRFトークン不正

> [共通仕様](./shared.md#403-forbidden--csrfトークン不正) を参照。

#### 403 Forbidden — 他ユーザーの予約を操作しようとした

```json
{
  "message": "この操作は許可されていません"
}
```

#### 404 Not Found — 予約が存在しない

```json
{
  "message": "予約が見つかりません"
}
```

#### 422 Unprocessable Entity — 受付終了

```json
{
  "message": "このイベントの受付は終了しています"
}
```

---

## DELETE `/api/reserve/:reservationId`

### 概要

予約をキャンセルする（予約レコードごと削除）。

### リクエストヘッダー

```
Cookie: session=<session_token>
X-CSRF-Token: <csrf_token>
```

### パスパラメーター

| パラメーター | 型 | 説明 |
|---|---|---|
| `reservationId` | string | キャンセル対象の予約 UUID |

### レスポンス

#### 200 OK — キャンセル成功

```json
{
  "message": "予約をキャンセルしました"
}
```

#### 401 Unauthorized — 未認証

> [共通仕様](./shared.md#401-unauthorized--未認証) を参照。

#### 403 Forbidden — CSRFトークン不正

> [共通仕様](./shared.md#403-forbidden--csrfトークン不正) を参照。

#### 403 Forbidden — 他ユーザーの予約を操作しようとした

```json
{
  "message": "この操作は許可されていません"
}
```

#### 404 Not Found — 予約が存在しない

```json
{
  "message": "予約が見つかりません"
}
```

#### 422 Unprocessable Entity — 受付終了

```json
{
  "message": "このイベントの受付は終了しています"
}
```
