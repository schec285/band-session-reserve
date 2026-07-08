import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { auth } from "@/auth";
import { SessionProvider } from "@/features/auth/SessionProvider";
import { UserMenu } from "@/features/user/UserMenu";
import { Footer } from "@/features/layout/Footer";
import { APP_NAME } from "@/lib/constants/app";
import { PageTransitionProvider, PageContentArea } from "@/components/layout/PageTransition";
import { TransitionLink } from "@/components/layout/TransitionLink";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const envSettings = {
  production: {
    title: APP_NAME,
    headerBgColor: "bg-background",
  },
  preview: {
    title: `${APP_NAME} (検証環境)`,
    headerBgColor: "bg-green-200",
  },
  local: {
    title: `${APP_NAME} (開発環境)`,
    headerBgColor: "bg-yellow-200",
  },
};

const env = process.env.APP_ENV ?? "local";
const { title, headerBgColor } =
  envSettings[env as keyof typeof envSettings] ?? envSettings.local;

export const metadata: Metadata = {
  title: title,
  description: "バンドセッションの参加予約システム",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html lang="ja" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen flex flex-col bg-background">
        <SessionProvider session={session}>
          <PageTransitionProvider>
            <header className={`border-b sticky top-0 ${headerBgColor} z-40`}>
              <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
                <TransitionLink href="/" className="font-bold text-xl tracking-tight">
                  {title}
                </TransitionLink>
                <UserMenu />
              </div>
            </header>
            <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">
              <PageContentArea>{children}</PageContentArea>
            </main>
            <Footer />
          </PageTransitionProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
