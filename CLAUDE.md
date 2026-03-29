# CLAUDE.md

このファイルは、リポジトリ内のコードを扱う際に Claude Code (claude.ai/code) へのガイダンスを提供します。

## コマンド

```bash
npm run dev        # 開発サーバー起動
npm run build      # 本番ビルド
npm run start      # 本番サーバー起動
npm run lint       # Next.js 経由で ESLint を実行
```

テストフレームワークは未設定。

## アーキテクチャ

**Next.js App Router** を使ったバンドセッション予約システム（`band-session-reserve`）。

**スタック**: Next.js 16 + React 19 + TypeScript。データベースなし（現状、予約内容はコンソールへのログ出力のみ）。

**主なデータフロー**:
1. ユーザーが `/reserve` ページのフォームを送信（`components/ReserveForm.tsx` がクライアントコンポーネントとして描画）
2. `ReserveForm.tsx` でクライアントサイドバリデーション
3. `/api/reserve` へ POST（`app/api/reserve/route.ts` が処理）
4. サーバーサイドで再バリデーション → コンソールにログ出力 → JSON レスポンスを返す

**フォーム項目**: 名前、日付（本日以降）、曲名、パート（Guitar/Bass/Drums/Keyboard/Vocal/その他）、コメント（任意）。

**バリデーションは意図的に二重実装** — `ReserveForm.tsx` でクライアント側、`app/api/reserve/route.ts` でサーバー側、同じ許可 `part` 値に対して両方で検証する。

## 注意事項

- UI テキストはすべて日本語。
- ダークテーマは `app/globals.css` の CSS カスタムプロパティで定義。
- 永続化ストレージなし — 拡張する場合は `app/api/reserve/route.ts` にデータベース層を追加する必要がある。
