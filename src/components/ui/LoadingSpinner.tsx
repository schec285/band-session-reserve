/**
 * ローディングスピナーの共通UIコンポーネント。
 * Next.js の loading.tsx から呼び出すことを想定している。
 */
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
    </div>
  );
}
