/**
 * ルートページのローディング表示。
 */
export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
    </div>
  );
}
