"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { UserCircle, ShieldCheck } from "lucide-react";

/**
 * ヘッダー右端のユーザーアイコンメニュー。
 * ログイン済みはドロップダウンでマイ予約・プロフィール・サインアウトを表示する。
 * 未ログインはサインインボタンを表示する。
 */
export function UserMenu() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return <div className="w-8 h-8" />;
  }

  if (!session) {
    return (
      <button
        onClick={() => router.push("/auth/signin")}
        className="text-sm font-medium px-4 py-2 rounded-md border border-border hover:bg-accent transition-colors"
      >
        サインイン
      </button>
    );
  }

  const isAdmin = session.user?.role === "admin";

  return (
    <div className="flex items-center gap-2">
      {isAdmin && (
        <button
          onClick={() => router.push("/admin")}
          aria-label="管理者ページ"
          className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md border border-border hover:bg-accent transition-colors"
        >
          <ShieldCheck className="w-4 h-4" />
          管理者
        </button>
      )}
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="ユーザーメニュー"
        className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-accent transition-colors"
      >
        <UserCircle className="w-7 h-7 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-popover shadow-md z-50">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium truncate">{session.user?.name ?? "ユーザー"}</p>
            <p className="text-xs text-muted-foreground truncate">{session.user?.email}</p>
          </div>
          <nav className="py-1">
            <button
              onClick={() => { setOpen(false); router.push("/my/reservations"); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors"
            >
              マイ予約
            </button>
            <button
              onClick={() => { setOpen(false); router.push("/my/profile"); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors"
            >
              プロフィール
            </button>
            <div className="border-t border-border my-1" />
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-accent transition-colors"
            >
              サインアウト
            </button>
          </nav>
        </div>
      )}
    </div>
    </div>
  );
}
