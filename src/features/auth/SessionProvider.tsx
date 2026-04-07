"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

/**
 * NextAuth の SessionProvider をラップするクライアントコンポーネント。
 * App Router では Server Component から直接 SessionProvider を使えないため、
 * このラッパーを layout.tsx で使用する。
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
