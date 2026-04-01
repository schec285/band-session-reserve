# バンドセッション予約システム

バンドセッションへの参加を予約するための Web アプリケーションです。

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
