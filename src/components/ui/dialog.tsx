"use client";

import { useEffect, useRef } from "react";

/**
 * モーダルダイアログの基本コンポーネント。
 * open が true のときにオーバーレイ付きで表示し、背景クリックまたは Escape キーで閉じる。
 */
export function Dialog({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="w-full max-w-2xl mx-4 rounded-xl bg-background border shadow-lg">
        {children}
      </div>
    </div>
  );
}

/**
 * ダイアログのヘッダー部分。タイトルと閉じるボタンを配置する。
 */
export function DialogHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b">
      <h2 className="text-base font-semibold">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="閉じる"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * ダイアログのコンテンツ領域。スクロール可能な本文エリア。
 */
export function DialogContent({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">{children}</div>;
}

/**
 * ダイアログのフッター部分。アクションボタンを右寄せで配置する。
 */
export function DialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end gap-3 px-6 py-4 border-t">{children}</div>
  );
}
