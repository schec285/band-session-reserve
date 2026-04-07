import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";

/**
 * 管理者画面レイアウト。
 * admin ロール以外はトップページへリダイレクトする。
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex gap-8">
      <nav className="w-48 shrink-0">
        <ul className="space-y-1">
          <li>
            <Link
              href="/admin/events"
              className="block px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
            >
              イベント管理
            </Link>
          </li>
          <li>
            <Link
              href="/admin/songs"
              className="block px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
            >
              曲管理
            </Link>
          </li>
        </ul>
      </nav>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
