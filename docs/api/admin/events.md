# API 設計書 — 管理者用イベント (`/api/admin/events`)

> 認証: すべてのエンドポイントで admin ロールが必要。
> 未認証は 401、admin 以外は 403 を返す。共通エラー形式は [shared.md](../shared.md) を参照。
> すべてのエンドポイントで CSRF トークン検証が必須（`X-CSRF-Token` ヘッダー）。詳細は [shared.md](../shared.md#403-forbidden--csrfトークン不正) を参照。

---

## エンドポイント一覧

| メソッド | パス | 概要 |
|---|---|---|
| POST | [`/api/admin/events`](#post-apiadminevents) | イベントを作成する |
| PUT | [`/api/admin/events/:eventId`](#put-apiadmineventseventid) | イベントを更新する |
| DELETE | [`/api/admin/events/:eventId`](#delete-apiadmineventseventid) | イベントを削除する |
| POST | [`/api/admin/events/:eventId/songs`](#post-apiadmineventseventidsongs) | イベントに曲を追加する |

---

## POST `/api/admin/events`

### 概要

新しいイベントを作成する。

### リクエストボディ

```json
{
  "title": "春のバンドセッション 2026",
  "startAt": "2026-04-20T10:00:00+09:00",
  "endAt": "2026-04-20T18:00:00+09:00",
  "closedAt": "2026-04-15T23:59:59+09:00",
  "venue": "渋谷スタジオ A",
  "description": "春の定期セッションです。"
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `title` | string | ○ | イベント名 |
| `startAt` | string | ○ | 開始日時（ISO 8601）。現在日時より後であること |
| `endAt` | string | ○ | 終了日時（ISO 8601）。`startAt` より後であること |
| `closedAt` | string \| null | — | 受付締切日時（ISO 8601）。`startAt` 以前であること。省略時は `null` |
| `venue` | string | ○ | 開催場所 |
| `description` | string | ○ | イベント概要 |

### レスポンス

#### 201 Created

```json
{
  "event": {
    "id": "event-uuid-1",
    "title": "春のバンドセッション 2026",
    "startAt": "2026-04-20T10:00:00+09:00",
    "endAt": "2026-04-20T18:00:00+09:00",
    "closedAt": "2026-04-15T23:59:59+09:00",
    "venue": "渋谷スタジオ A",
    "description": "春の定期セッションです。"
  }
}
```

#### 400 Bad Request — バリデーションエラー

```json
{
  "message": "入力内容に誤りがあります",
  "errors": [
    { "field": "startAt", "message": "開始日時は現在日時より後に設定してください" }
  ]
}
```

---

## PUT `/api/admin/events/:eventId`

### 概要

既存イベントを全フィールド上書き更新する。

### パスパラメーター

| パラメーター | 型 | 説明 |
|---|---|---|
| `eventId` | string | 対象イベントの UUID |

### リクエストボディ

POST と同じフィールド構成。全フィールド必須。

### レスポンス

#### 200 OK

```json
{
  "event": {
    "id": "event-uuid-1",
    "title": "春のバンドセッション 2026（更新）",
    "startAt": "2026-04-20T10:00:00+09:00",
    "endAt": "2026-04-20T18:00:00+09:00",
    "closedAt": null,
    "venue": "渋谷スタジオ A",
    "description": "更新しました。"
  }
}
```

#### 400 Bad Request — バリデーションエラー

POST と同形式。

#### 404 Not Found — イベントが存在しない

```json
{
  "message": "イベントが見つかりません"
}
```

---

## DELETE `/api/admin/events/:eventId`

### 概要

指定イベントを削除する。

### パスパラメーター

| パラメーター | 型 | 説明 |
|---|---|---|
| `eventId` | string | 対象イベントの UUID |

### レスポンス

#### 200 OK

```json
{
  "message": "イベントを削除しました"
}
```

#### 404 Not Found — イベントが存在しない

```json
{
  "message": "イベントが見つかりません"
}
```

---

## POST `/api/admin/events/:eventId/songs`

### 概要

既存の曲をイベントに追加し、募集するパートを指定する。

### パスパラメーター

| パラメーター | 型 | 説明 |
|---|---|---|
| `eventId` | string | 対象イベントの UUID |

### リクエストボディ

```json
{
  "songId": "song-uuid-1",
  "parts": ["leadGuitar", "bass", "drums", "vocal"]
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `songId` | string | ○ | 追加する曲の UUID |
| `parts` | string[] | ○ | 募集するパートのリスト。1つ以上必須 |

### レスポンス

#### 201 Created

```json
{
  "eventSong": {
    "eventSongId": "event-song-uuid-1",
    "songId": "song-uuid-1",
    "title": "千本桜",
    "artist": "黒うさP",
    "parts": ["leadGuitar", "bass", "drums", "vocal"]
  }
}
```

#### 400 Bad Request — バリデーションエラー

```json
{
  "message": "入力内容に誤りがあります",
  "errors": [
    { "field": "parts", "message": "パートを1つ以上選択してください" }
  ]
}
```
