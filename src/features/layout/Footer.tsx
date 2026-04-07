/**
 * サイト共通フッター。
 * HP・各種SNSリンクとコピーライトを表示する。
 */
export function Footer() {
  const links = [
    { label: "公式HP", href: "#" },
    { label: "X (Twitter)", href: "#" },
    { label: "Instagram", href: "#" },
  ];

  return (
    <footer className="border-t mt-auto">
      <div className="max-w-2xl mx-auto px-6 py-6 flex flex-col items-center gap-4">
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
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} OTONOWA</p>
      </div>
    </footer>
  );
}
