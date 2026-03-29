import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="ja">
      <body>
        {/* ヘッダー */}
        <header className="header">
          <div className="container header-inner">
            <a href="/" className="header-logo">
              🎸 BandSession
            </a>
            <nav className="header-nav">
              <a href="/reserve">予約する</a>
            </nav>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main>{children}</main>
      </body>
    </html>
  );
}
