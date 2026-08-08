# CLAUDE.md

このファイルは、リポジトリ内のコードを扱う際に Claude Code (claude.ai/code) へのガイダンスを提供します。
日本語で会話。

## コマンド

```bash
npm run dev        # 開発サーバー起動
npm run build      # 本番ビルド
npm run start      # 本番サーバー起動
npm run lint       # Next.js 経由で ESLint を実行
npm test           # テスト実行（Vitest）
npm run test:watch # ウォッチモード
npm run test:api   # APIテストのみ
```

**テストフレームワーク**: Vitest + node-mocks-http

- APIテスト: `node` 環境（`src/tests/api/**/*.test.ts`）
- サービステスト: `node` 環境（`src/tests/services/**/*.test.ts`）
- その他のユニットテスト（lib配下のユーティリティ等）: `node` 環境（`src/tests/lib/**/*.test.ts`）
- 設定ファイル: `vitest.config.ts`

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
1. 型定義（`src/lib/types/`）
2. リポジトリ実装（`src/server/repositories/`）※TDD対象外・依存元として先に用意
3. サービスのテスト作成（`src/tests/services/**/*.test.ts`）→ サービス実装（`src/server/services/`）※リポジトリをモック
4. APIルートのテスト作成（`src/tests/api/**/*.test.ts`）→ APIルート実装（`src/app/api/**/*.ts`）
5. フロントエンド実装

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
    lib/         # lib配下のユニットテスト
  lib/
    types/       # 型定義（api/{endpoint}/index.ts, domain/{entity}.ts）
  components/    # フロントエンドコンポーネント
  features/      # ページ固有のクライアントコンポーネント（events/, reserve/ など）
```

**主なデータフロー**:
1. ユーザーが `/events/[eventId]` ページで曲・パートを選択（`src/features/events/SongList.tsx` がクライアントコンポーネントとして描画）
2. `SongList.tsx` から `EntryConfirmDialog.tsx`（`src/features/reserve/EntryConfirmDialog.tsx`）を開き、譲渡可否・SNS同意・参加ポリシー同意・コメント入力を行った上でクライアントサイドバリデーション
3. `/api/reserve` へ POST（`src/app/api/reserve/route.ts` が処理）
4. サーバーサイドで再バリデーション → DBに保存 → JSON レスポンスを返却

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

- コンポーネント本体だけでなく、内部のイベントハンドラ・ヘルパー関数・コンストラクタにも同様に付与する。
- リポジトリ層のインターフェースメソッドシグネチャ（`interface IXxxRepository` 内の各メソッド宣言、実装本体を持たない型宣言）も「関数」として本規約の対象とする。単一行コメントではなく複数行JSDoc形式で記載する。
- `src/components/ui/` 配下のshadcn/base-ui生成コードは本規約の対象外とする。同ディレクトリ内でも独自実装のコンポーネント（例: `dialog.tsx`）は対象内。

**HTTPメソッドの使い分け**:
- `GET` は状態変更を一切行わない（副作用禁止）
- `POST` / `PUT` / `PATCH` / `DELETE` はすべて CSRF トークン検証を必須とする

**ソート処理の実装層**:
- リポジトリ層のSQL `ORDER BY`（Drizzleの `orderBy` / `asc()` / `desc()`）を使う: 単一クエリの結果に対する、DBカラム値そのものによる単純な昇順・降順ソート（タイブレークを含む複合キーも可）。例: `findAllSongs()` のアーティスト名昇順・曲名昇順。
- サービス層のJSソート（`.sort()`）を使う: 以下のいずれかに該当する場合。
  - 複数クエリ結果をマージした後のソート
  - 実行時点（`now` など）に依存する分類・ソート（例: `getEvents()` の開催中/予定/終了への分類）
  - 固定の任意順序（`PART_ORDER` など）によるソート
  - ロケール考慮の文字列比較（`localeCompare`）
- 表示層（`page.tsx` やコンポーネント）ではソートしない。ソートはビジネスロジックとしてテスト可能なサービス層に置く。ただし「呼び出し元に依存せず常に固定順で描画する」ことがコンポーネント自体の責務である場合（例: `PartBadgeList` の `PART_ORDER` ソート）は表示不変条件として例外的に許容する。

## 注意事項

- UI テキストはすべて日本語。