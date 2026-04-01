# バンドセッション予約システム

バンドセッションへの参加を予約するための Web アプリケーションです。演奏したい曲・担当パート・日程を入力するだけで予約が完了します。

## 技術スタック

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成し、各値を設定してください。

```bash
cp .env.local.example .env.local
```

`SESSION_SECRET` と `API_TOKEN_SECRET` は以下のコマンドで生成できます。

```bash
openssl rand -hex 32
```

### 3. データベースの起動

#### Docker を使う場合

```bash
docker compose up -d
```

#### ローカルの PostgreSQL を使う場合

ローカルに PostgreSQL をインストール済みであれば、`.env.local` の `DATABASE_URL` を接続先に合わせて変更してください。

### 4. マイグレーションの実行

```bash
npm run db:migrate
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

開発サーバーが起動したら http://localhost:3000 にアクセスしてください。

## コマンド

| コマンド | 説明 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番サーバー起動 |
| `npm run lint` | ESLint 実行 |
| `npm test` | テスト実行 |
| `npm run test:watch` | テストをウォッチモードで実行 |
| `npm run test:api` | APIテストのみ実行 |
| `npm run test:ui` | UIテストのみ実行 |

## 開発フロー

**TDD（テスト駆動開発）** を採用しています。

```
1. Red   — 失敗するテストを書く
2. Green — テストが通る最小限の実装をする
3. Refactor — コードを整理する
```

**実装順序**: 型定義 → APIテスト → API実装 → UIテスト → UI実装

### テストファイルの配置

各ディレクトリに `test/` サブディレクトリを作成し、対象ファイルと同名の `.test.ts` / `.test.tsx` を置く。

```
src/app/api/reserve/
  route.ts
  test/
    route.test.ts       ← APIテスト（node環境）
src/components/ReserveForm/
  index.tsx
  test/
    index.test.tsx      ← UIテスト（jsdom環境）
src/types/
  reserve.ts            ← 型定義（テスト・実装の共通基盤）
```

## CI / GitHub Actions

PRを作成すると以下のチェックが自動実行されます。**すべてグリーンでないとマージ不可**です。

```
PR作成
  ├─ [1] TDDテスト（npm test）
  │       └─ FAIL → マージ不可 ❌
  └─ [2] ビルド確認（npm run build）※テスト通過後に実行
          └─ FAIL → マージ不可 ❌
```

設定ファイル: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

## 予約フォームの入力項目

| 項目 | 必須 | 内容 |
|---|---|---|
| 名前 | ✓ | 参加者の名前 |
| 日付 | ✓ | セッション日（本日以降） |
| 曲名 | ✓ | 演奏したい曲 |
| パート | ✓ | Guitar / Bass / Drums / Keyboard / Vocal / その他 |
| コメント | — | 自由記入欄 |

