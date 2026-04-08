import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

/**
 * 管理者画面のローディング表示。
 * admin レイアウトのサイドバーはそのまま表示され、コンテンツ領域にスピナーを表示する。
 */
export default function Loading() {
  return <LoadingSpinner />;
}
