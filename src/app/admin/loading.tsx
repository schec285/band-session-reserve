/**
 * 管理者画面のローディング表示。
 * admin レイアウトのサイドバーはそのまま表示され、コンテンツ領域にスピナーを表示する。
 */
export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
    </div>
  );
}
