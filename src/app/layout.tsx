import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "バンドセッション予約",
  description: "バンドセッションの参加予約システム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={cn("font-sans", geist.variable)}>
      <body>
        {/* ヘッダー */}
        <header className="header">
          <div className="container header-inner">
            <a href="/" className="header-logo">
              🎸 BandSession
            </a>
            <nav className="header-nav"></nav>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main>{children}</main>
      </body>
    </html>
  );
}
