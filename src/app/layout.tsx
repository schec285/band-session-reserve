import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { auth } from "@/auth";
import { SessionProvider } from "@/features/auth/SessionProvider";
import { UserMenu } from "@/features/user/UserMenu";
import { Footer } from "@/features/layout/Footer";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const prod = process.env.APP_ENV === "production";
const title = prod ? "OTONOWA" : "OTONOWA (開発環境)";
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
  const headerBgColor = prod ? "bg-background" : "bg-yellow-400";
  return (
    <html lang="ja" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen flex flex-col bg-background">
        <SessionProvider session={session}>
          <header className={`border-b sticky top-0 ${headerBgColor} z-40`}>
            <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
              <a href="/" className="font-bold text-xl tracking-tight">
                {title}
              </a>
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">{children}</main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
