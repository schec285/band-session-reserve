# API 設計書 — 認証 (`/api/auth`)

---

## ユーザーロール

| 値 | 説明 | 備考 |
|---|---|---|
| `"member"` | 一般メンバー | 登録時のデフォルト |
| `"admin"` | 管理者 | イベント・曲の管理が可能 |

- 新規登録ユーザーは常に `"member"` として作成される
- `"admin"` への昇格は既存の管理者のみが行える（管理者向け API は別途設計）

---

## 認証フロー概要

```
1. POST /api/auth/register     → アカウント作成 + 確認メール送信
2. POST /api/auth/verify-email → メールアドレス認証 → アカウント有効化
3. POST /api/auth/login        → セッションクッキー + API トークン発行
4. POST /api/auth/logout       → セッション無効化
```

---

## POST `/api/auth/register`

### 概要

新規ユーザーを登録する。登録直後はアカウントが**未有効化**状態となり、確認メールを送信する。メールアドレス認証が完了するまでログインはできない。

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

#### 201 Created — 登録成功（メール送信済み）

```json
{
  "success": true,
  "message": "確認メールを送信しました。メール内のリンクからアカウントを有効化してください"
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

## POST `/api/auth/verify-email`

### 概要

確認メールに含まれるトークンを検証し、アカウントを有効化する。

### リクエスト

**Content-Type**: `application/json`

#### ボディ

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `token` | string | ✓ | 確認メールに含まれる検証トークン |

#### リクエスト例

```json
{
  "token": "a1b2c3d4e5f6..."
}
```

### レスポンス

#### 200 OK — 有効化成功

```json
{
  "success": true,
  "message": "メールアドレスを確認しました。ログインしてください"
}
```

#### 400 Bad Request — トークン不正・期限切れ

| 条件 | `message` |
|---|---|
| `token` が空 | `"トークンが指定されていません"` |
| トークンが無効 | `"無効なトークンです"` |
| トークンの有効期限切れ | `"トークンの有効期限が切れています。再度登録してください"` |

---

## POST `/api/auth/login`

### 概要

認証情報を検証し、セッションクッキーと API トークンを発行する。メールアドレス未認証のアカウントはログインできない。

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
  "token": "<api_token>",
  "role": "member"
}
```

> `token` はクライアントが保持し、以降のリクエストの `Authorization` ヘッダーで使用する。
> `role` は `"admin"` または `"member"`。クライアントはこの値で管理者向け UI の表示を切り替える。

#### 401 Unauthorized — 認証失敗

```json
{
  "success": false,
  "message": "メールアドレスまたはパスワードが正しくありません"
}
```

#### 403 Forbidden — メールアドレス未認証

```json
{
  "success": false,
  "message": "メールアドレスの確認が完了していません。確認メールをご確認ください"
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
