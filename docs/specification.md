# バンドセッション予約システム 仕様設計書

## 1. システム概要

### 1.1 目的

バンドセッションへの参加者が、演奏したい曲・担当パート・希望日程をオンラインで登録・予約できる Web アプリケーション。

### 1.2 技術スタック

| 項目 | 内容 |
|---|---|
| フレームワーク | Next.js 16 (App Router) |
| UI ライブラリ | React 19 |
| 言語 | TypeScript |
| スタイリング | CSS カスタムプロパティ（グローバル CSS） |
| データ永続化 | 未実装（コンソールログのみ） |

---

## 2. 画面設計

### 2.1 ページ一覧

| パス | 種別 | 概要 |
|---|---|---|
| `/` | Static（Server Component） | トップページ（ヒーローセクション＋特徴カード） |
| `/reserve` | Static（Server Component） | 予約フォームページ |
| `/api/reserve` | Dynamic（API Route） | 予約受付 API（POST のみ受付） |

### 2.2 トップページ（`/`）

- ヒーローセクション：キャッチコピー・説明文・「予約する」ボタン
- 特徴カード（3枚）：曲のリクエスト / パートの選択 / 日程の指定

### 2.3 予約フォームページ（`/reserve`）

- 「← トップへ戻る」リンク
- ページタイトル・サブタイトル
- 予約フォーム（`ReserveForm` コンポーネント）

---

## 3. 機能設計

### 3.1 予約フォーム

`components/ReserveForm.tsx` がクライアントコンポーネント（`"use client"`）として描画を担う。

#### 入力項目

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `name` | `string` | ✓ | 参加者の名前 |
| `date` | `string` (YYYY-MM-DD) | ✓ | 参加希望日（本日以降） |
| `songTitle` | `string` | ✓ | 演奏したい曲名 |
| `part` | `Part`（下記参照） | ✓ | 担当パート |
| `comment` | `string` | — | 任意のコメント |

#### パート選択肢（`Part` 型）

| 値 | 表示ラベル |
|---|---|
| `guitar` | ギター |
| `bass` | ベース |
| `drums` | ドラム |
| `keyboard` | キーボード |
| `vocal` | ボーカル |
| `other` | その他 |

#### フォームの状態管理

| 状態 | 型 | 説明 |
|---|---|---|
| `form` | `ReservationForm` | 各フィールドの入力値 |
| `errors` | `FormErrors` | フィールドごとのエラーメッセージ |
| `isSubmitting` | `boolean` | 送信中フラグ（二重送信防止） |
| `result` | `ApiResponse \| null` | API レスポンスの表示用 |

### 3.2 クライアントサイドバリデーション

送信ボタン押下時に実行。エラーがあれば API リクエストを送らずにフォームへエラー表示する。

| チェック内容 | エラーメッセージ |
|---|---|
| `name` が空（空白のみも NG） | 「名前を入力してください」 |
| `date` が未選択 | 「日付を選択してください」 |
| `date` が過去日 | 「今日以降の日付を選択してください」 |
| `songTitle` が空（空白のみも NG） | 「曲名を入力してください」 |
| `part` が未選択 | 「パートを選択してください」 |

入力フィールドを編集すると、そのフィールドのエラーはリアルタイムにクリアされる。

### 3.3 送信フロー

```
ユーザーが送信ボタンをクリック
    │
    ▼
クライアントサイドバリデーション
    │ NG → エラーを表示して処理終了
    │ OK
    ▼
POST /api/reserve（JSON ボディ）
    │
    ▼
サーバーサイドバリデーション（route.ts）
    │ NG → 400 + エラーメッセージを返す
    │ OK
    ▼
コンソールにログ出力
    │
    ▼
200 + 成功メッセージを返す
    │
    ▼
フォームをリセット・結果メッセージを表示
```

---

## 4. API 設計

### 4.1 `POST /api/reserve`

#### リクエスト

- `Content-Type: application/json`

```json
{
  "name": "山田 太郎",
  "date": "2026-04-01",
  "songTitle": "Don't Stop Believin'",
  "part": "guitar",
  "comment": "よろしくお願いします"
}
```

#### レスポンス（成功）

```json
HTTP 200
{
  "success": true,
  "message": "予約を受け付けました！山田 太郎さん、2026-04-01のセッションでお待ちしています 🎵"
}
```

#### レスポンス（バリデーションエラー）

```json
HTTP 400
{
  "success": false,
  "message": "名前は必須です"  // エラー内容に応じたメッセージ
}
```

#### レスポンス（サーバーエラー）

```json
HTTP 500
{
  "success": false,
  "message": "サーバーエラーが発生しました。しばらく後にお試しください。"
}
```

#### サーバーサイドバリデーション項目

| チェック内容 | HTTPステータス | メッセージ |
|---|---|---|
| `name` が空 | 400 | 「名前は必須です」 |
| `date` が未指定 | 400 | 「日付は必須です」 |
| `songTitle` が空 | 400 | 「曲名は必須です」 |
| `part` が不正値 | 400 | 「パートが不正です」 |

### 4.2 `GET /api/reserve`

POST 以外のメソッドは `405 Method Not Allowed` を返す。

```json
HTTP 405
{
  "success": false,
  "message": "Method Not Allowed"
}
```

---

## 5. 型定義（`types/reservation.ts`）

```typescript
type Part = "guitar" | "bass" | "drums" | "keyboard" | "vocal" | "other";

interface ReservationForm {
  name: string;
  date: string;
  songTitle: string;
  part: Part;
  comment?: string;
}

interface FormErrors {
  name?: string;
  date?: string;
  songTitle?: string;
  part?: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
}
```

---

## 6. UI・デザイン仕様

### 6.1 テーマ

ダークテーマ。`app/globals.css` の CSS カスタムプロパティで色を一元管理。

| 変数名 | 値 | 用途 |
|---|---|---|
| `--bg` | `#0a0a0a` | ページ背景 |
| `--bg-card` | `#1a1a2e` | カード・ヘッダー背景 |
| `--bg-input` | `#16213e` | 入力フィールド背景 |
| `--accent` | `#e94560` | アクセントカラー（ボタン・ロゴ等） |
| `--accent-hover` | `#c73652` | アクセントホバー |
| `--text` | `#eaeaea` | メインテキスト |
| `--text-muted` | `#9ca3af` | サブテキスト |
| `--border` | `#2d2d4e` | ボーダー |
| `--success` | `#10b981` | 成功メッセージ |
| `--error` | `#ef4444` | エラーメッセージ |

### 6.2 レイアウト

- コンテンツ最大幅：`640px`（中央揃え）
- レスポンシブ対応：特徴カードは `auto-fit` グリッドで折り返し

### 6.3 インタラクション

- フォーカス時：アクセントカラーのボーダー＋シャドウ
- エラー時：エラーカラーのボーダー＋シャドウ
- 送信中：ボタンをスピナー表示に切り替え・`disabled` 状態で二重送信防止

---

## 7. 今後の拡張ポイント

| 項目 | 概要 |
|---|---|
| データ永続化 | `app/api/reserve/route.ts` にデータベース層（PostgreSQL 等）を追加 |
| 予約一覧 | 管理者向けの予約確認画面 |
| 認証 | ログイン機能・管理者権限 |
| メール通知 | 予約完了時の確認メール送信 |
| テスト | Jest / Vitest によるユニット・E2E テストの導入 |
