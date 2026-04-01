# CLAUDE.md

このファイルは、リポジトリ内のコードを扱う際に Claude Code (claude.ai/code) へのガイダンスを提供します。

## コマンド

```bash
npm run dev        # 開発サーバー起動
npm run build      # 本番ビルド
npm run start      # 本番サーバー起動
npm run lint       # Next.js 経由で ESLint を実行
npm test           # テスト実行（Jest）
npm run test:watch # ウォッチモード
npm run test:api   # APIテストのみ
npm run test:ui    # UIテストのみ
```

**テストフレームワーク**: Jest + ts-jest + React Testing Library + node-mocks-http

- APIテスト: `node` 環境（`src/app/api/**/test/*.test.ts`）
- UIテスト: `jsdom` 環境（`src/components/**/test/*.test.tsx`）
- 設定ファイル: `jest.config.ts`

**テストファイルの配置**: 各ディレクトリに `test/` サブディレクトリを作成し、対象ファイルと同名の `.test.ts` / `.test.tsx` を置く。

```
src/app/api/reserve/
  route.ts
  test/
    route.test.ts
```

## 開発方針

**開発フロー**: バックエンドAPI設計先行 → フロントエンド実装の順で進める。

**開発手法**: TDD（テスト駆動開発）を採用。
1. 失敗するテストを書く（Red）
2. テストが通る最小限の実装をする（Green）
3. リファクタリング（Refactor）

**実装順序**:
1. 型定義（`src/types/`）
2. APIルートのテスト作成（`src/app/api/**/test/*.test.ts`）
3. APIルート実装（`src/app/api/**/*.ts`）
4. フロントエンドのテスト作成（`src/components/**/test/*.test.tsx`）
5. フロントエンド実装

## アーキテクチャ

**Next.js App Router** を使ったバンドセッション予約システム（`band-session-reserve`）。

**スタック**: Next.js 16 + React 19 + TypeScript + PostgreSQL（Drizzle ORM）。

**主なデータフロー**:
1. ユーザーが `/reserve` ページのフォームを送信（`src/components/ReserveForm.tsx` がクライアントコンポーネントとして描画）
2. `ReserveForm.tsx` でクライアントサイドバリデーション
3. `/api/reserve` へ POST（`src/app/api/reserve/route.ts` が処理）
4. サーバーサイドで再バリデーション → DBに保存 → JSON レスポンスを返す

**フォーム項目**: 名前、日付（本日以降）、曲名、パート（Guitar/Bass/Drums/Keyboard/Vocal/その他）、コメント（任意）。

**バリデーションは意図的に二重実装** — `ReserveForm.tsx` でクライアント側、`src/app/api/reserve/route.ts` でサーバー側、同じ許可 `part` 値に対して両方で検証する。

## CI / GitHub Actions

`.github/workflows/ci.yml` にPR時の自動チェックを定義。

- **job順序**: `test` → `build`（`needs: test` でテスト通過後にビルド実行）
- **マージ条件**: Branch Protection Rules で `TDDテスト` と `ビルド確認` の両ジョブがグリーンであることを必須とする
- テストが1件でも失敗するとマージ不可

## 実装ルール

**HTTPメソッドの使い分け**:
- `GET` は状態変更を一切行わない（副作用禁止）
- `POST` / `PUT` / `PATCH` / `DELETE` はすべて CSRF トークン検証を必須とする

## 注意事項

- UI テキストはすべて日本語。
- ダークテーマは `src/app/globals.css` の CSS カスタムプロパティで定義。
- DBスキーマは `src/lib/db/schema/` に Drizzle ORM で定義済み。
