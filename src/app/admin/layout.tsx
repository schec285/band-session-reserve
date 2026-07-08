import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminNav } from "@/features/admin/AdminNav";
import { AdminNavigationProvider, AdminContentArea } from "@/features/admin/AdminContentTransition";

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
    <AdminNavigationProvider>
      <div className="flex flex-col gap-6">
        <AdminNav />
        <AdminContentArea>
          <div>{children}</div>
        </AdminContentArea>
      </div>
    </AdminNavigationProvider>
  );
}
