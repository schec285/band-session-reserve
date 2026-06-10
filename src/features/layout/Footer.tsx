import { APP_NAME } from "@/lib/constants/app";

/**
 * サイト共通フッター。
 * HP・各種SNSリンクとコピーライトを表示する。
 */
export function Footer() {
  const links = [
    { label: "ホームページ", href: "https://musicsessionotonowa.com/" },
    { label: "X (Twitter)", href: "https://x.com/otonowa150435?s=21" },
    { label: "Instagram", href: "#" },
    { label: "TikTok", href: "https://www.tiktok.com/@otonowa2?_r=1&_t=ZS-93RpBS7c3jW" },
  ];

  return (
    <footer className="border-t mt-auto">
      <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col items-center gap-4">
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {APP_NAME}</p>
      </div>
    </footer>
  );
}
