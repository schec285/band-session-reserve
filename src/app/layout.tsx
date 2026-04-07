import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { SessionProvider } from "@/features/auth/SessionProvider";
import { UserMenu } from "@/features/auth/UserMenu";
import { Footer } from "@/features/layout/Footer";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "OTONOWA",
  description: "バンドセッションの参加予約システム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen flex flex-col bg-background">
        <SessionProvider>
          <header className="border-b sticky top-0 bg-background z-40">
            <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
              <a href="/" className="font-bold text-xl tracking-tight">
                OTONOWA
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
