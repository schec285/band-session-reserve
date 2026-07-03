"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Toast, type ToastVariant } from "@/components/ui/Toast";
import { ROLE_LABELS, type Role } from "@/lib/utils/roles";
import { formatDatetime } from "@/lib/utils/date";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface Props {
  users: User[];
  currentUserId: string;
}

interface PendingChange {
  userId: string;
  userName: string;
  toRole: Role;
}

/**
 * 登録ユーザー一覧を表示し、ロールを変更するコンポーネント。
 * ロール変更は確認ダイアログでの確定操作を経て送信する。
 */
export function AdminUserList({ users, currentUserId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);
  const [showVerified, setShowVerified] = useState(true);
  const [showUnverified, setShowUnverified] = useState(false);

  const filteredUsers = users.filter(
    (user) => (user.isVerified && showVerified) || (!user.isVerified && showUnverified)
  );

  function handleSelectChange(user: User, toRole: Role) {
    if (toRole === user.role) return;
    setPendingChange({ userId: user.id, userName: user.name, toRole });
  }

  function handleCancel() {
    if (submitting) return;
    setPendingChange(null);
  }

  async function handleConfirm() {
    if (!pendingChange) return;
    setSubmitting(true);

    const res = await fetch(`/api/admin/users/${pendingChange.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: pendingChange.toRole }),
    });

    setSubmitting(false);

    if (res.ok) {
      setToast({
        message: `${pendingChange.userName}さんのロールを${ROLE_LABELS[pendingChange.toRole]}に変更しました`,
        variant: "success",
      });
      setPendingChange(null);
      startTransition(() => router.refresh());
    } else {
      const json = await res.json();
      setToast({ message: json.message ?? "ロールの更新に失敗しました", variant: "error" });
      setPendingChange(null);
    }
  }

  if (users.length === 0) {
    return <p className="text-muted-foreground text-sm">登録ユーザーがいません。</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showVerified}
            onChange={(e) => setShowVerified(e.target.checked)}
            className="h-4 w-4 cursor-pointer"
          />
          登録済み
        </label>
        <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showUnverified}
            onChange={(e) => setShowUnverified(e.target.checked)}
            className="h-4 w-4 cursor-pointer"
          />
          未登録
        </label>
      </div>

      {filteredUsers.length === 0 ? (
        <p className="text-muted-foreground text-sm">該当するユーザーがいません。</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left font-medium p-3">氏名</th>
                <th className="text-left font-medium p-3">メールアドレス</th>
                <th className="text-left font-medium p-3">ステータス</th>
                <th className="text-left font-medium p-3">ロール</th>
                <th className="text-left font-medium p-3">登録日時</th>
                <th className="text-left font-medium p-3">最終ログイン日時</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isSelf = user.id === currentUserId;
                const createdAtLabel = new Date(user.createdAt).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });

                return (
                  <tr key={user.id} className="border-t">
                    <td className="p-3">{user.name}</td>
                    <td className="p-3 text-muted-foreground">{user.email}</td>
                    <td className="p-3">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          user.isVerified
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {user.isVerified ? "登録済み" : "未登録"}
                      </span>
                    </td>
                    <td className="p-3">
                      <select
                        value={user.role}
                        disabled={isSelf || isPending}
                        onChange={(e) => handleSelectChange(user, e.target.value as Role)}
                        className="border rounded-md px-2 py-1 text-sm bg-background disabled:opacity-50"
                      >
                        <option value="member">{ROLE_LABELS.member}</option>
                        <option value="admin">{ROLE_LABELS.admin}</option>
                      </select>
                      {isSelf && (
                        <span className="ml-2 text-xs text-muted-foreground">(自分自身)</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">{createdAtLabel}</td>
                    <td className="p-3 text-muted-foreground">
                      {user.lastLoginAt ? formatDatetime(user.lastLoginAt) : "未ログイン"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={pendingChange !== null} onClose={handleCancel}>
        <DialogHeader title="ロール変更の確認" onClose={handleCancel} />
        {pendingChange && (
          <DialogContent>
            <p className="text-sm">
              <span className="font-medium">{pendingChange.userName}</span> さんのロールを
              <span className="font-medium">{ROLE_LABELS[pendingChange.toRole]}</span>
              に変更します。よろしいですか？
            </p>
          </DialogContent>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={submitting}>
            キャンセル
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "変更中..." : "変更する"}
          </Button>
        </DialogFooter>
      </Dialog>

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
