"use server";

import { cookies } from "next/headers";
import type { ToastVariant } from "@/components/ui/Toast";

/**
 * フラッシュメッセージをクッキーにセットする。
 * リダイレクト前に呼び出し、遷移先ページで読み取って表示する。
 */
export async function setFlash(type: ToastVariant, message: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("flash", JSON.stringify({ type, message }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60,
  });
}

/**
 * フラッシュメッセージのクッキーを削除する。
 * 遷移先ページで表示後に呼び出す。
 */
export async function clearFlash(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("flash");
}
