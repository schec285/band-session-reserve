"use client";

import { usePathname } from "next/navigation";
import { AdminNavLink } from "@/features/admin/AdminNavLink";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "イベント管理", href: "/admin/events" },
  { label: "曲管理", href: "/admin/songs" },
  { label: "ユーザー管理", href: "/admin/users" },
];

/**
 * 管理者画面のタブナビゲーション。
 * 現在のパスに一致するタブをアクティブ表示する。
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b">
      <ul className="flex gap-1">
        {NAV_ITEMS.map(({ label, href }) => {
          const isActive = pathname.startsWith(href);
          return (
            <li key={href}>
              <AdminNavLink
                href={href}
                className={cn(
                  "inline-block px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                )}
              >
                {label}
              </AdminNavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
