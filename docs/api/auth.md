# API 設計書 — 認証 (`/api/auth`)

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
