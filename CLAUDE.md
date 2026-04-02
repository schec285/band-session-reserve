# CLAUDE.md

このファイルは、リポジトリ内のコードを扱う際に Claude Code (claude.ai/code) へのガイダンスを提供します。
日本語で会話。

## コマンド

```bash
npm run dev        # 開発サーバー起動
npm run build      # 本番ビルド
npm run start      # 本番サーバー起動
npm run lint       # Next.js 経由で ESLint を実行
npm test           # テスト実行（Jest）
npm run test:watch # ウォッチモード
npm run test:api   # APIテストのみ
```

**テストフレームワーク**: Jest + ts-jest + node-mocks-http

- APIテスト: `node` 環境（`src/tests/api/**/*.test.ts`）
- サービステスト: `node` 環境（`src/tests/services/**/*.test.ts`）
- 設定ファイル: `jest.config.ts`

**テストファイルの配置**: `src/tests/` 配下にソースのパスを反映した構造で配置する。

```
src/
  app/api/auth/login/
    route.ts
  server/services/auth/
    user.ts
  tests/
    api/auth/login/
      route.test.ts
    services/auth/
      user.test.ts
```

## 開発方針

**開発フロー**: バックエンドAPI設計先行 → フロントエンド実装の順で進める。

**開発手法**: TDD（テスト駆動開発）を採用。
1. 失敗するテストを書く（Red）
2. テストが通る最小限の実装をする（Green）
3. リファクタリング（Refactor）

**実装順序**:
1. 型定義（`src/types/`）
2. APIルートのテスト作成（`src/tests/api/**/*.test.ts`）
3. APIルート実装（`src/app/api/**/*.ts`）
4. フロントエンド実装

## アーキテクチャ

**Next.js App Router** を使ったバンドセッション予約システム（`band-session-reserve`）。

**スタック**: Next.js 16 + React 19 + TypeScript + PostgreSQL（Drizzle ORM）。

**ディレクトリ構成**:
```
drizzle/
  schema/        # DBスキーマ定義
  migrations/    # drizzle-kit 生成マイグレーション
src/
  app/api/       # Next.js APIルート
  server/
    services/    # ビジネスロジック
    repositories/ # DBアクセス層
  tests/
    api/         # APIルートテスト
    services/    # サービステスト
  components/    # フロントエンドコンポーネント
  types/         # 型定義
```

**主なデータフロー**:
1. ユーザーが `/reserve` ページのフォームを送信（`src/components/ReserveForm.tsx` がクライアントコンポーネントとして描画）
2. `ReserveForm.tsx` でクライアントサイドバリデーション
3. `/api/reserve` へ POST（`src/app/api/reserve/route.ts` が処理）
4. サーバーサイドで再バリデーション → DBに保存 → JSON レスポンスを
## CI / GitHub Actions

- **job順序**: `test` → `build`（`needs: test` でテスト通過後にビルド実行）
- **マージ条件**: Branch Protection Rules で `TDDテスト` と `ビルド確認` の両ジョブがグリーンであることを必須とする
- テストが1件でも失敗するとマージ不可

## 実装ルール

**コメント規約**:
- すべての関数に複数行のJSDocコメントでsummaryを記載する。
- 形式は以下の通り。

```ts
/**
 * 1行目に関数の概要を書く。
 * 必要に応じて補足を続ける。
 */
```

**HTTPメソッドの使い分け**:
- `GET` は状態変更を一切行わない（副作用禁止）
- `POST` / `PUT` / `PATCH` / `DELETE` はすべて CSRF トークン検証を必須とする

## 注意事項

- UI テキストはすべて日本語。