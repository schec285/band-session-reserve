import { redirect } from "next/navigation";

/**
 * 管理者トップページ。イベント管理にリダイレクトする。
 */
export default function AdminPage() {
  redirect("/admin/events");
}
