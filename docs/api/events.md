# API 設計書 — イベント (`/api/events`)

---

## エンドポイント一覧

| メソッド | パス | 概要 | 認証要否 |
|---|---|---|---|
| GET | `/api/events` | イベント一覧を取得する | 不要 |
| GET | `/api/events/:eventId/songs` | イベントの曲一覧と予約状況を取得する | 不要 |

---

## GET `/api/events`

### 概要

開催予定・過去のイベント一覧を取得する。認証不要で誰でも参照できる。

### レスポンス

#### 200 OK

```json
{
  "success": true,
  "events": [
    {
      "id": "event-uuid-1",
      "title": "春のバンドセッション 2026",
      "startAt": "2026-04-20T10:00:00+09:00",
      "endAt": "2026-04-20T18:00:00+09:00",
      "closedAt": null,
      "venue": "渋谷スタジオ A",
      "description": "春の定期セッションです。初心者歓迎！"
    },
    {
      "id": "event-uuid-2",
      "title": "冬のバンドセッション 2025",
      "startAt": "2025-12-15T12:00:00+09:00",
      "endAt": "2025-12-15T20:00:00+09:00",
      "closedAt": "2025-12-10T23:59:59+09:00",
      "venue": "新宿スタジオ B",
      "description": "年末の締めくくりセッションでした。"
    }
  ]
}
```

#### レスポンスフィールド（events 配列の各要素）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | イベント UUID |
| `title` | string | イベント名 |
| `startAt` | string | 開始日時（ISO 8601） |
| `endAt` | string | 終了日時（ISO 8601） |
| `closedAt` | string \| null | 受付締め切り日時（ISO 8601）。`null` の場合は `startAt` が締め切り |
| `venue` | string | 開催場所 |
| `description` | string | イベント概要 |

> 受付中かどうかはクライアントが `(closedAt ?? startAt) > 現在時刻` で判断する。

---

## GET `/api/events/:eventId/songs`

### 概要

指定イベントの曲一覧と、各曲のパート別予約状況を取得する。認証不要で誰でも参照できる。

### パスパラメーター

| パラメーター | 型 | 説明 |
|---|---|---|
| `eventId` | string | 対象イベントの UUID |

### レスポンス

#### 200 OK

```json
{
  "success": true,
  "eventId": "event-uuid-1",
  "songs": [
    {
      "id": "song-uuid-1",
      "title": "千本桜",
      "reservations": [
        { "part": "readGuitar",    "isFilled": true  },
        { "part": "backingGuitar", "isFilled": false },
        { "part": "bass",          "isFilled": false },
        { "part": "drums",         "isFilled": true  },
        { "part": "keyboard",      "isFilled": false },
        { "part": "vocal",         "isFilled": false }
      ]
    }
  ]
}
```

#### レスポンスフィールド（songs 配列の各要素）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | 曲 UUID |
| `title` | string | 曲名 |
| `reservations` | array | パート別の予約状況 |
| `reservations[].part` | string | パート名 |
| `reservations[].isFilled` | boolean | 予約済みかどうか |

> ユーザー個人の予約情報（誰が予約したか）は含まない。パートが埋まっているかどうかのみ公開する。
> 曲に不要なパートは `reservations` 配列に含めない（配列に存在しない＝その曲では募集していない）。

#### 404 Not Found — イベントが存在しない

```json
{
  "success": false,
  "message": "イベントが見つかりません"
}
```
