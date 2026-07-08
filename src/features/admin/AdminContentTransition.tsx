"use client";

import { createContext, useContext, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface AdminNavigateContextValue {
  navigate: (href: string) => void;
  isPending: boolean;
}

const AdminNavigateContext = createContext<AdminNavigateContextValue | null>(null);

function useAdminNavigateContext(): AdminNavigateContextValue {
  const ctx = useContext(AdminNavigateContext);
  if (!ctx) {
    throw new Error("この hook は AdminNavigationProvider 内でのみ使用できます");
  }
  return ctx;
}

/**
 * AdminNavigationProvider が提供する画面遷移関数を取得する。
 */
export function useAdminNavigate(): (href: string) => void {
  return useAdminNavigateContext().navigate;
}

/**
 * 画面遷移が進行中かどうかを取得する。
 */
export function useAdminNavigatePending(): boolean {
  return useAdminNavigateContext().isPending;
}

/**
 * 管理画面のタブナビゲーション・コンテンツ領域を横断して遷移状態を共有するプロバイダー。
 * AdminNavLink 押下と同時に isPending が true になるため、通信完了を待たずに
 * クリック直後からローディング表示に切り替えられる。
 */
export function AdminNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <AdminNavigateContext.Provider value={{ navigate, isPending }}>
      {children}
    </AdminNavigateContext.Provider>
  );
}

/**
 * 管理画面のコンテンツ領域。遷移中は admin/loading.tsx と同じ中央スピナー表示に置き換える。
 */
export function AdminContentArea({ children }: { children: ReactNode }) {
  const isPending = useAdminNavigatePending();
  return isPending ? <LoadingSpinner /> : <>{children}</>;
}
