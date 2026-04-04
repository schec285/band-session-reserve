# API 設計書 — 認証 (`/api/auth`)

> エラーレスポンスの共通形式は [shared.md](./shared.md) を参照。

---

## ユーザーロール

| 値 | 説明 | 備考 |
|---|---|---|
| `"member"` | 一般メンバー | 登録時のデフォルト |
| `"admin"` | 管理者 | 全機能権限 |

- 新規登録ユーザーは常に `"member"` として作成される
- `"admin"` への昇格は既存の管理者のみが行える（管理者向け API は別途設計）

---

## エンドポイント一覧

| メソッド | パス | 概要 | 認証要否 |
|---|---|---|---|
| POST | [`/api/auth/register`](#post-apiauthregister) | ユーザー登録（確認メール送信） | 不要 |
| POST | [`/api/auth/verify-email`](#post-apiauthverify-email) | 認証コード + チャレンジ検証・アカウント有効化 | 不要 |
| POST | [`/api/auth/login`](#post-apiauthlogin) | ログイン（セッションクッキー発行） | 不要 |
| POST | [`/api/auth/logout`](#post-apiauthlogout) | ログアウト（セッションクッキー削除） | 要 |
| POST | [`/api/auth/password-reset/request`](#post-apiauthpassword-resetrequest) | パスワードリセットメール送信 | 不要 |
| POST | [`/api/auth/password-reset`](#post-apiauthpassword-reset) | パスワードリセット | 不要 |

---


## POST `/api/auth/register`

### 概要

新規ユーザーを登録する。`pending_users`テーブルに登録され、確認メールを送信する。メール認証後、`users`テーブルに挿入される。
ユーザ名とメールアドレスはユニークなので、`users`テーブルと`pending_users`テーブルの有効時間内であるデータで重複が0件であることを確認して、メールアドレスをキーにUPSERTする。

### リクエスト

**ヘッダー**:

```
X-CSRF-Token: <csrf_token>
Content-Type: application/json
```

#### ボディ

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `username` | string | ✓ | ユーザー名（表示名） |
| `email` | string | ✓ | メールアドレス |
| `password` | string | ✓ | パスワード（12文字以上、大文字・数字・記号を各1文字以上含む） |

#### リクエスト例

```json
{
  "username": "山田太郎",
  "email": "yamada@example.com",
  "password": "p@ssw0rd"
}
```

### レスポンス

#### 201 Created — 登録成功（メール送信済み）

**レスポンスヘッダー**:

```
Set-Cookie: challenge=<nonce>; Secure; SameSite=Strict; Path=/api/auth/verify-email
```

**レスポンスボディ**:

```json
{
  "message": "確認メールを送信しました。メールに記載の認証コードを入力してアカウントを有効化してください"
}
```

> `challenge` はクッキーとして発行される。クライアントはクッキーの値を読み取り、`POST /api/auth/verify-email` の `X-Challenge-Token` ヘッダーに付与して送信する。一回限り有効。

#### 400 Bad Request — バリデーションエラー

```json
{
  "message": "入力内容を確認してください",
  "errors": [
    { "field": "username", "message": "ユーザー名は必須です" }
  ]
}
```

| `field` | 条件 | `message` |
|---|---|---|
| `username` | 空 | `"ユーザー名は必須です"` |
| `email` | 空 | `"メールアドレスは必須です"` |
| `email` | 形式不正 | `"メールアドレスの形式が不正です"` |
| `password` | 空 | `"パスワードは必須です"` |
| `password` | ポリシー違反 | `"パスワードは12文字以上で、大文字・数字・記号を各1文字以上含めてください"` |

#### 409 Conflict — コンフリクトエラー

```json
{
  "message": "入力内容を確認してください",
  "errors": [
    { "field": "email", "message": "このメールアドレスは既に使用されています" }
  ]
}
```

| `field` | 条件 | `message` |
|---|---|---|
| `username` | 既に登録済み | `"このユーザー名は既に使用されています"` |
| `email` | 既に登録済み | `"このメールアドレスは既に使用されています"` |

---

## POST `/api/auth/verify-email`

### 概要

確認メールに記載された認証コードと、登録時に発行されたチャレンジを検証し、アカウントを有効化する。

### リクエスト

**ヘッダー**:

```
X-CSRF-Token: <csrf_token>
X-Challenge-Token: <challenge>
Content-Type: application/json
```

> `X-Challenge-Token` は `POST /api/auth/register` のレスポンスで発行された `challenge` クッキーの値を読み取り付与する。

#### ボディ

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `code` | string | ✓ | メールに記載された認証コード（6桁の数字） |

#### リクエスト例

```json
{
  "code": "483920"
}
```

### レスポンス

#### 200 OK — 有効化成功

```json
{
  "message": "メールアドレス認証が完了しました。ログインしてください"
}
```

#### 400 Bad Request — バリデーションエラー

```json
{
  "message": "入力内容を確認してください",
  "errors": [
    { "field": "code", "message": "認証コードは必須です" }
  ]
}
```

| `field` | 条件 | `message` |
|---|---|---|
| `code` | 空 | `"認証コードは必須です"` |
| `code` | 6桁の数字でない | `"認証コードは6桁の数字で入力してください"` |

#### 401 Unauthorized — 認証失敗

```json
{
  "message": "認証コードが正しくありません"
}
```

| 条件 | `message` |
|---|---|
| `code` が不正 | `"認証コードが正しくありません"` |
| `challenge` が不正 | `"操作が無効です。最初からやり直してください"` |

#### 408 Request Timeout — 期限切れ

| 条件 | `message` |
|---|---|
| `code`の有効期限切れ（5分） | `"認証コードの有効期限が切れています。再度登録してください"` |

---

## POST `/api/auth/login`

### 概要

認証情報を検証し、セッションクッキーを発行する。
メールアドレス未認証のアカウントは認証失敗とする。

### リクエスト

**ヘッダー**:

```
X-CSRF-Token: <csrf_token>
Content-Type: application/json
```

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
  "message": "ログインしました",
  "role": "member"
}
```

> `role` は `"admin"` または `"member"`。クライアントはこの値で管理者向け UI の表示を切り替える。
> CSRFトークンのローテーションはサーバーがセッション発行時に自動で行う。

#### 400 Bad Request — バリデーションエラー

```json
{
  "message": "入力内容を確認してください",
  "errors": [
    { "field": "email", "message": "メールアドレスは必須です" }
  ]
}
```

| `field` | 条件 | `message` |
|---|---|---|
| `email` | 空 | `"メールアドレスは必須です"` |
| `email` | 形式不正 | `"メールアドレスの形式が不正です"` |
| `password` | 空 | `"パスワードは必須です"` |

#### 401 Unauthorized — 認証失敗

| 条件 | `message` |
|---|---|
| メールアドレスまたはパスワードが不正 | `"メールアドレスまたはパスワードが正しくありません"` |
| メールアドレス未認証 | `"メールアドレスまたはパスワードが正しくありません"` |

---

## POST `/api/auth/logout`

### 概要

セッションクッキーを無効化する。

### リクエストヘッダー

```
Cookie: session=<session_token>
X-CSRF-Token: <csrf_token>
```

### レスポンス

#### 200 OK

**レスポンスヘッダー**:

```
Set-Cookie: session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0
```

```json
{
  "message": "ログアウトしました"
}
```

---

## POST `/api/auth/password-reset/request`

### 概要

パスワードリセット用の認証コード（6桁の数字）を生成し、登録済みメールアドレスに送信する。メールアドレスが存在しない場合も同一のレスポンスを返す（メールアドレス列挙攻撃対策）。

### リクエスト

**ヘッダー**:

```
X-CSRF-Token: <csrf_token>
Content-Type: application/json
```

#### ボディ

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `email` | string | ✓ | 登録済みメールアドレス |

#### リクエスト例

```json
{
  "email": "yamada@example.com"
}
```

### レスポンス

#### 200 OK

**レスポンスヘッダー**:

```
Set-Cookie: challenge=<nonce>; Secure; SameSite=Strict; Path=/api/auth/password-reset
```

**レスポンスボディ**:

```json
{
  "message": "パスワードリセット用の認証コードを送信しました。メールに記載の認証コードを入力してパスワードを再設定してください"
}
```

> メールアドレスが登録されていない場合も同じレスポンスを返す。
> `challenge` はクッキーとして発行される。クライアントはクッキーの値を読み取り、`POST /api/auth/password-reset` の `X-Challenge-Token` ヘッダーに付与して送信する。一回限り有効。

#### 400 Bad Request — バリデーションエラー

```json
{
  "message": "入力内容を確認してください",
  "errors": [
    { "field": "email", "message": "メールアドレスは必須です" }
  ]
}
```

| `field` | 条件 | `message` |
|---|---|---|
| `email` | 空 | `"メールアドレスは必須です"` |
| `email` | 形式不正 | `"メールアドレスの形式が不正です"` |

---

## POST `/api/auth/password-reset`

### 概要

メールに記載された認証コードと新しいパスワードを受け取り、パスワードを更新する。認証コードは有効期限付き・1回限り有効。

### リクエスト

**ヘッダー**:

```
X-CSRF-Token: <csrf_token>
X-Challenge-Token: <challenge>
Content-Type: application/json
```

> `X-Challenge-Token` は `POST /api/auth/password-reset/request` のレスポンスで発行された `challenge` クッキーの値を読み取り付与する。

#### ボディ

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `code` | string | ✓ | メールに記載された認証コード（6桁の数字） |
| `password` | string | ✓ | 新しいパスワード（12文字以上、大文字・数字・記号を各1文字以上含む） |

#### リクエスト例

```json
{
  "code": "847201",
  "password": "newP@ssw0rd"
}
```

### レスポンス

#### 200 OK — パスワード更新成功

```json
{
  "message": "パスワードを再設定しました。新しいパスワードでログインしてください"
}
```

#### 400 Bad Request — バリデーションエラー

```json
{
  "message": "入力内容を確認してください",
  "errors": [
    { "field": "code", "message": "認証コードは必須です" }
  ]
}
```

| `field` | 条件 | `message` |
|---|---|---|
| `code` | 空 | `"認証コードは必須です"` |
| `code` | 6桁の数字でない | `"認証コードは6桁の数字で入力してください"` |
| `password` | 空 | `"パスワードは必須です"` |
| `password` | ポリシー違反 | `"パスワードは12文字以上で、大文字・数字・記号を各1文字以上含めてください"` |

#### 401 Unauthorized — 認証失敗

| 条件 | `message` |
|---|---|
| `code`が不正 | `"認証コードが正しくありません"` |
| `challenge`が不正 | `"操作が無効です。最初からやり直してください"` |

#### 408 Request Timeout — 期限切れ

| 条件 | `message` |
|---|---|
| `code` が期限切れ・使用済み（5分） | `"認証コードの有効期限が切れています。再度パスワードリセットを申請してください"` |
