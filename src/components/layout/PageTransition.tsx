"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";

interface PageNavigateContextValue {
  navigate: (href: string) => void;
  /** 遷移先ページの実コンテンツが描画されたことを通知する。PageReady 専用。 */
  notifyReady: (pathname: string) => void;
  isPending: boolean;
}

const PageNavigateContext = createContext<PageNavigateContextValue | null>(null);

function usePageNavigateContext(): PageNavigateContextValue {
  const ctx = useContext(PageNavigateContext);
  if (!ctx) {
    throw new Error("この hook は PageTransitionProvider 内でのみ使用できます");
  }
  return ctx;
}

/**
 * PageTransitionProvider が提供する画面遷移関数を取得する。
 */
export function usePageNavigate(): (href: string) => void {
  return usePageNavigateContext().navigate;
}

/**
 * 画面遷移が進行中かどうかを取得する。
 */
export function usePageNavigatePending(): boolean {
  return usePageNavigateContext().isPending;
}

/**
 * ナビゲーション・コンテンツ領域を横断して遷移状態を共有するプロバイダー。
 *
 * Next.js の loading.tsx（Suspense フォールバック）は、遷移先ページのデータ取得が
 * 終わる前の中間フレームでも「表示可能」と判断されるため、isPending を素直に
 * useTransition だけに頼ると「自作スピナー → loading.tsx のスピナー → 本描画」と
 * スピナーが一瞬リセットされながら2回マウントされてしまう。
 * そのため isPending は「navigate() 呼び出し」〜「遷移先ページの実コンテンツ（PageReady）が
 * 描画されるまで」の間を自前で管理し、その間は常に自作スピナーだけを表示し続ける。
 */
export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  // navigate/notifyReady の参照を固定する。ここが再レンダーのたびに変わると、
  // それを依存配列に含む PageReady 側の useEffect が意図せず再実行され、
  // 描画待ちのタイマーがキャンセル → notifiedRef のガードで再スケジュールされず
  // 二度と発火しない、という競合を起こしうるため。
  const navigate = useCallback(
    (href: string) => {
      const targetPath = href.split("?")[0].split("#")[0];
      if (targetPath !== pathnameRef.current) {
        setPendingPath(targetPath);
      }
      router.push(href);
    },
    [router]
  );

  const notifyReady = useCallback((path: string) => {
    setPendingPath((current) => (current === path ? null : current));
  }, []);

  const value = useMemo(
    () => ({ navigate, notifyReady, isPending: pendingPath !== null }),
    [navigate, notifyReady, pendingPath]
  );

  return <PageNavigateContext.Provider value={value}>{children}</PageNavigateContext.Provider>;
}

/**
 * ナビゲーション対象のコンテンツ領域。
 * 遷移中は中央スピナー表示で覆い、実コンテンツは裏側でそのまま描画させておく
 * （PageReady が届いた時点で表面のスピナーだけを外す）。
 */
export function PageContentArea({ children }: { children: ReactNode }) {
  const isPending = usePageNavigatePending();
  return (
    <div className="relative">
      {children}
      {/*
        isPending で条件付きマウント/アンマウントすると、実コンテンツの描画完了と
        オーバーレイ消滅のタイミングがブラウザの描画バジェット上ずれることがあり、
        ごく短い空白フレームが挟まることがある。常時マウントしてopacityの
        トランジションで消すことで、そのズレを視覚的に吸収する。
      */}
      <div
        aria-hidden={!isPending}
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-background transition-opacity duration-150",
          isPending ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <LoadingSpinner />
      </div>
    </div>
  );
}

/**
 * 各ページの実コンテンツ直下に配置するマーカー。
 * マウントされた時点で「このページの本描画が完了した」とみなし、
 * PageContentArea のスピナーオーバーレイを外す。
 */
export function PageReady() {
  const pathname = usePathname();
  const { notifyReady } = usePageNavigateContext();
  const notifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (notifiedRef.current === pathname) return;
    notifiedRef.current = pathname;
    notifyReady(pathname);
  }, [pathname, notifyReady]);

  return null;
}
