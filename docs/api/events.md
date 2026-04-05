# API 設計書 — イベント (`/api/events`)

---

## エンドポイント一覧

| メソッド | パス | 概要 | 認証要否 |
|---|---|---|---|
| GET | [`/api/events`](#get-apievents) | イベント一覧を取得する | 不要 |
| GET | [`/api/events/:eventId/songs`](#get-apieventseventidsongs) | イベントの曲一覧と予約状況を取得する | 不要 |

---

## GET `/api/events`

### 概要

開催予定・過去のイベント一覧を取得する。認証不要で誰でも参照できる。

### レスポンス

#### 200 OK

```json
{
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
> 並び順: 募集中イベント（`startAt` 昇順）を先頭に、終了済みイベント（`startAt` 降順）をその後に続ける。

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
  "songs": [
    {
      "id": "song-uuid-1",
      "title": "千本桜",
      "reservations": [
        { "part": "readGuitar",    "username": "yamada_taro" },
        { "part": "backingGuitar", "username": null          },
        { "part": "bass",          "username": null          },
        { "part": "drums",         "username": "sato_hanako" },
        { "part": "keyboard",      "username": null          },
        { "part": "vocal",         "username": null          }
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
| `reservations[].username` | string \| null | 予約者のユーザー名。`null` の場合は空き |

> `username` が `null` であれば空き、文字列であれば予約済みを表す。
> 曲に不要なパートは `reservations` 配列に含めない（配列に存在しない＝その曲では募集していない）。

#### 404 Not Found — イベントが存在しない

```json
{
  "message": "イベントが見つかりません"
}
```
