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
 * アプリ全体・管理画面など、スコープごとに1つ設置するプロバイダー。
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
 * 時点で isPending が早期に false へ倒れてしまうため、この仕組みを使う画面
 * (一般画面・管理画面とも) では loading.tsx を撤去してある。
 *
 * 管理画面のようにナビゲーション部分を固定表示にしたいスコープは、この
 * Provider を入れ子でもう1つ設置する（例: admin/layout.tsx）。外側の
 * Provider は `nestedScopePrefixes` に現在地が該当する間、クリックの
 * ハンドリングを完全に内側の Provider に譲る（何もしない）ため、二重に
 * 処理されることはない。
 */
export function AutoNavProvider({
  children,
  nestedScopePrefixes,
}: {
  children: ReactNode;
  /**
   * 現在のURL（遷移先ではなく現在地）がこのプレフィックスに該当する間、
   * クリックのハンドリングを内側にネストされた別の AutoNavProvider に譲り、
   * この Provider 自身は何もしない。
   * layout.tsx は Server Component のため、関数ではなく文字列配列で受け取る。
   */
  nestedScopePrefixes?: string[];
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

      if (
        nestedScopePrefixes?.some(
          (prefix) => window.location.pathname === prefix || window.location.pathname.startsWith(`${prefix}/`)
        )
      ) {
        return;
      }

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
  }, [router, nestedScopePrefixes]);

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
 *
 * 背景（bg-background の板）はこの div のサイズ（＝children の高さ）に
 * absolute inset-0 でフィットさせて実コンテンツを覆うが、そのサイズは
 * ページごと・遷移中の新旧コンテンツの入れ替わりで変わりうる。スピナー
 * アイコン自体をその板の中央に置くと、板の高さが変わるたびにアイコンの
 * 表示位置もジャンプしてしまうため、アイコンは fixed でビューポート中央に
 * 固定し、板の高さ変化から完全に切り離す。
 */
export function AutoNavContentArea({ children }: { children: ReactNode }) {
  const { isPending } = useAutoNavContext();

  return (
    <div className="relative min-h-[60vh]">
      {children}
      <div
        aria-hidden={!isPending}
        className={cn(
          "absolute inset-0 bg-background transition-opacity duration-150",
          isPending ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <LoadingSpinner />
        </div>
      </div>
    </div>
  );
}
