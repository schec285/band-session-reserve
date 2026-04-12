"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

/**
 * トースト通知のバリアント。
 * - success : 緑（成功・完了）
 * - warning : オレンジ寄りの黄色（注意・警告）
 * - error   : 赤（エラー・失敗）
 */
export type ToastVariant = "success" | "warning" | "error";

const CONTAINER_CLASS: Record<ToastVariant, string> = {
  success: "bg-green-100 border-green-300 text-green-900",
  warning: "bg-amber-100 border-amber-300 text-amber-900",
  error:   "bg-red-100 border-red-300 text-red-900",
};

const CLOSE_BUTTON_CLASS: Record<ToastVariant, string> = {
  success: "text-green-500 hover:text-green-800",
  warning: "text-amber-500 hover:text-amber-800",
  error:   "text-red-500 hover:text-red-800",
};

interface ToastProps {
  /**
   * 表示するメッセージ。
   */
  message: string;
  /**
   * 色バリアント。デフォルトは "success"。
   */
  variant?: ToastVariant;
  /**
   * 非表示になったときに呼ばれるコールバック。
   * 親側でメッセージ状態を null に戻すために使う。
   */
  onClose: () => void;
}

/**
 * 画面固定のトースト通知コンポーネント。
 * PCでは右上、モバイルでは上部中央に表示する。
 * 表示から5秒後に1秒かけてフェードアウトし自動で閉じる。
 * ×ボタンで即時閉じることもできる。
 */
export function Toast({ message, variant = "success", onClose }: ToastProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    setFading(false);
    const fadeTimer = setTimeout(() => setFading(true), 5000);
    return () => clearTimeout(fadeTimer);
  }, [message]);

  /**
   * フェードアウト完了後に親へ閉じる通知を送る。
   */
  function handleTransitionEnd() {
    if (fading) onClose();
  }

  return (
    <div
      role="status"
      aria-live="polite"
      onTransitionEnd={handleTransitionEnd}
      className={[
        /* 位置: モバイルは上部中央、sm以上は右上 */
        "fixed top-4 left-4 right-4",
        "sm:left-auto sm:right-4 sm:w-96",
        /* 見た目 */
        "z-50 border rounded-xl px-5 py-4 shadow-lg",
        "flex items-start gap-3",
        /* フェードアニメーション */
        "transition-opacity duration-1000",
        fading ? "opacity-0" : "opacity-100",
        CONTAINER_CLASS[variant],
      ].join(" ")}
    >
      <p className="flex-1 text-base font-medium leading-snug">{message}</p>
      <button
        onClick={onClose}
        aria-label="閉じる"
        className={["shrink-0 mt-0.5", CLOSE_BUTTON_CLASS[variant]].join(" ")}
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
