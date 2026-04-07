"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

/**
 * NextAuth の SessionProvider をラップするクライアントコンポーネント。
 * App Router では Server Component から直接 SessionProvider を使えないため、
 * このラッパーを layout.tsx で使用する。
 * session を props で受け取ることで初期ローディングのちらつきを防ぐ。
 */
export function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
}
