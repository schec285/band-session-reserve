"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Toast } from "@/components/ui/Toast";

/**
 * 曲の新規登録後、URLクエリパラメータ created 経由で成功トーストを表示するコンポーネント。
 * 表示後は履歴を汚さないよう created パラメータをURLから取り除く。
 */
export function SongsCreatedToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const created = searchParams.get("created");
  const [message, setMessage] = useState<string | null>(null);

  // created の変化時のみ実行する。router/pathname を依存に含めると置き換え後の再遷移で無限ループになる。
  useEffect(() => {
    if (!created) return;
    setMessage(`${created}曲を登録しました。`);
    router.replace(pathname, { scroll: false });
  }, [created]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!message) return null;

  return <Toast message={message} variant="success" onClose={() => setMessage(null)} />;
}
