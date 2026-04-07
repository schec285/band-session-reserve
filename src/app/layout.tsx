import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { SessionProvider } from "@/features/auth/SessionProvider";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

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
      <body className="min-h-screen bg-background">
        <SessionProvider>
          <header className="border-b">
            <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
              <a href="/" className="font-bold text-lg">
                🎸 BandSession
              </a>
            </div>
          </header>
          <main className="max-w-2xl mx-auto px-6 py-8">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
