# DB 設計書

バンドセッション予約システムのデータベース設計。

- **DB**: PostgreSQL
- **UUID 生成**: `gen_random_uuid()`（PostgreSQL 13 以降標準）

---

## テーブル一覧

| テーブル名 | 概要 |
|---|---|
| `users` | 登録ユーザー |
| `events` | セッションイベント |
| `songs` | イベントに紐づく曲 |
| `reservations` | 予約（ヘッダー） |
| `reservation_parts` | 予約に紐づくパート明細 |

---

## `users`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | ユーザーID |
| `username` | VARCHAR(100) | NOT NULL | 表示名 |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | メールアドレス |
| `password_hash` | VARCHAR(255) | NOT NULL | ハッシュ化済みパスワード |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 登録日時 |

```sql
CREATE TABLE users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

---

## `events`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | イベントID |
| `title` | VARCHAR(255) | NOT NULL | イベント名 |
| `date` | DATE | NOT NULL | 開催日 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |

```sql
CREATE TABLE events (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title      VARCHAR(255) NOT NULL,
  date       DATE         NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

---

## `songs`

イベントに紐づく曲。同一イベント内で曲名の重複を禁止する。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 曲ID |
| `event_id` | UUID | NOT NULL, FK → events.id | 所属イベント |
| `title` | VARCHAR(255) | NOT NULL | 曲名 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |

```sql
CREATE TABLE songs (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID         NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, title)
);
```

---

## `reservations`

予約のヘッダー情報。パート明細は `reservation_parts` で管理する。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 予約ID |
| `song_id` | UUID | NOT NULL, FK → songs.id | 予約曲 |
| `user_id` | UUID | NOT NULL, FK → users.id | 予約者 |
| `sns_consent` | BOOLEAN | NOT NULL | SNS顔出し同意 |
| `comment` | TEXT | | 備考 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 予約日時 |

```sql
CREATE TABLE reservations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id     UUID        NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sns_consent BOOLEAN     NOT NULL,
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## `reservation_parts`

予約に紐づくパート明細。1予約につき複数パートを持てる（ボーカル兼楽器等に対応）。
`vocal` / `other` は複数人を許容し、それ以外のパートは同一曲で1人まで。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 明細ID |
| `reservation_id` | UUID | NOT NULL, FK → reservations.id | 予約ID |
| `song_id` | UUID | NOT NULL, FK → songs.id | 予約曲（部分インデックス用に非正規化） |
| `part` | VARCHAR(20) | NOT NULL | 担当パート |

```sql
CREATE TABLE reservation_parts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID        NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  song_id        UUID        NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  part           VARCHAR(20) NOT NULL
);

-- readGuitar/backingGuitar/bass/drums/keyboard は同一曲で1人まで
-- vocal/other は複数人を許容するため対象外
CREATE UNIQUE INDEX unique_limited_parts
  ON reservation_parts (song_id, part)
  WHERE part NOT IN ('vocal', 'other');
```

### `part` の許可値

| 値 | 表示名 | 上限 |
|---|---|---|
| `readGuitar` | リードギター | 1人（部分インデックスで保証） |
| `backingGuitar` | バッキングギター | 1人（部分インデックスで保証） |
| `bass` | ベース | 1人（部分インデックスで保証） |
| `drums` | ドラム | 1人（部分インデックスで保証） |
| `keyboard` | キーボード | 1人（部分インデックスで保証） |
| `vocal` | ボーカル | 上限なし |
| `other` | その他 | 上限なし |

---

## テーブル関連図

```
users
  │
  └─< reservations >──< reservation_parts
                  │               │
events            │               │
  │               │               │
  └─< songs ──────┴───────────────┘
```

---

## 競合制御

パートの重複申し込みはアプリケーション層でハンドリングする。

- `vocal` / `other`: 制約なし。重複チェック不要。
- それ以外: `reservation_parts` への INSERT 時に一意制約違反（PostgreSQL エラーコード `23505`）が発生した場合、アプリ側で `409 Conflict` を返す。
- トランザクション分離レベル: **READ COMMITTED**（デフォルト）のまま使用。部分インデックスが DB レベルで整合性を保証するため SERIALIZABLE 不要。
- `reservations` と `reservation_parts` への INSERT は同一トランザクション内で行う。
