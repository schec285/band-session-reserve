"use client";

import { createContext, useContext, useTransition, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";

interface AutoNavContextValue {
  navigate: (href: string) => void;
  isPending: boolean;
}

const AutoNavContext = createContext<AutoNavContextValue | null>(null);

function useAutoNavContext(): AutoNavContextValue {
  const ctx = useContext(AutoNavContext);
  if (!ctx) {
    throw new Error("この hook は AutoNavProvider 内でのみ使用できます");
  }
  return ctx;
}

/**
 * ボタンなど、実際の <a> タグではない要素から画面遷移する場合に使う。
 * 通常のリンククリックは AutoNavProvider が自動検知するため、これは
 * router.push を直接使いたい特殊なケース専用（例: メニュー内のボタン）。
 */
export function useAutoNavigate(): (href: string) => void {
  return useAutoNavContext().navigate;
}

/**
 * 画面遷移が進行中かどうかを取得する。
 */
export function useAutoNavPending(): boolean {
  return useAutoNavContext().isPending;
}

/**
 * ルート直下に1つだけ設置するプロバイダー。
 *
 * 個々の Link を専用コンポーネントに置き換えたり、遷移先ページにマーカーを
 * 設置したりする必要がないよう、内部リンクのクリックをドキュメント全体で
 * グローバルに検知して自動的にスピナー表示に切り替える。
 * 素の <a>・next/link の Link・どちらでも同じ挙動になる。
 *
 * 「遷移完了」の判定は React の useTransition が返す isPending をそのまま使う。
 * router.push を startTransition でラップすると、遷移先ページの実際の描画が
 * 完了してコミットされるまで isPending が true のまま維持される（React が
 * 「フォールバックへの一瞬の切り替え」を避けるため）。ただし対象ルートに
 * loading.tsx が存在すると、その Suspense フォールバックが表示可能になった
 * 時点で isPending が早期に false へ倒れてしまうため、一般画面からは
 * loading.tsx を撤去してある。
 */
export function AutoNavProvider({
  children,
  skipPrefixes,
}: {
  children: ReactNode;
  /**
   * このプレフィックスで始まるパスへのリンクは自動検知の対象外にする
   * （別の仕組みで遷移を扱うページ向け）。
   * layout.tsx は Server Component のため、関数ではなく文字列配列で受け取る。
   */
  skipPrefixes?: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.dataset.noTransition !== undefined) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      if (skipPrefixes?.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) return;

      // next/link の Link は自前の onClick で preventDefault + router.push を行う。
      // そのハンドラは React のイベント委譲によりバブリングフェーズで先に発火するため、
      // 同じくバブリングフェーズで document に仕込んだリスナーでは e.defaultPrevented が
      // 既に true になっており、素通りしてスピナーが起動できない。
      // そのため、ここではキャプチャフェーズで先回りして横取りする。
      e.preventDefault();
      e.stopPropagation();
      navigate(anchor.href.slice(url.origin.length));
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, skipPrefixes]);

  return (
    <AutoNavContext.Provider value={{ navigate, isPending }}>
      {children}
    </AutoNavContext.Provider>
  );
}

/**
 * ナビゲーション対象のコンテンツ領域。遷移中は中央スピナー表示で覆う。
 * 実コンテンツは裏側でそのまま描画させておき、opacityのトランジションで
 * 消すことで、実描画とオーバーレイ消滅のタイミングのズレを吸収する。
 */
export function AutoNavContentArea({ children }: { children: ReactNode }) {
  const { isPending } = useAutoNavContext();

  return (
    <div className="relative">
      {children}
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
