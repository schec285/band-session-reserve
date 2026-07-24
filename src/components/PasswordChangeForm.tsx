"use client";

import { useState } from "react";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Toast, type ToastVariant } from "@/components/ui/Toast";
import { PasswordPolicyChecklist } from "@/components/ui/PasswordPolicyChecklist";
import { isPasswordPolicySatisfied } from "@/lib/utils/password";
import { fetchWithCsrf } from "@/lib/client/fetchWithCsrf";

/**
 * プロフィール画面の「パスワード」行。
 * 「変更する」ボタン押下でモーダルを開き、現在のパスワードと新しいパスワードを入力して
 * PUT /api/user/password に送信する。成功時はモーダルを閉じてトースト通知、
 * 失敗時はモーダルを閉じたままトースト通知でエラーを表示する。
 */
export function PasswordChangeForm() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ variant: ToastVariant; message: string } | null>(null);

  function resetFields() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
  }

  function openModal() {
    resetFields();
    setOpen(true);
  }

  async function handleSubmit() {
    if (newPassword !== confirmNewPassword) {
      setToast({ variant: "error", message: "パスワードが一致しません" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetchWithCsrf("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
      });
      const json = await res.json();
      if (res.ok) {
        setOpen(false);
        resetFields();
        setToast({ variant: "success", message: json.message ?? "パスワードを変更しました" });
      } else {
        setToast({ variant: "error", message: json.message ?? "パスワードの変更に失敗しました" });
      }
    } catch {
      setToast({ variant: "error", message: "通信エラーが発生しました" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="py-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">パスワード</p>
          <p className="text-sm">••••••••</p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="shrink-0 text-xs text-foreground border border-border rounded px-3 py-1.5 hover:bg-accent transition-colors"
        >
          変更する
        </button>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} dismissible={false}>
        <DialogHeader title="パスワード変更" onClose={() => setOpen(false)} />
        <DialogContent>
          <div className="space-y-1">
            <label htmlFor="current-password" className="text-xs text-muted-foreground mb-1 block">
              現在のパスワード
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="new-password" className="text-xs text-muted-foreground mb-1 block">
              新しいパスワード
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <PasswordPolicyChecklist password={newPassword} />
          </div>
          <div className="space-y-1">
            <label htmlFor="confirm-new-password" className="text-xs text-muted-foreground mb-1 block">
              新しいパスワード（確認）
            </label>
            <input
              id="confirm-new-password"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm px-4 py-2 rounded-md border border-border hover:bg-accent transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !isPasswordPolicySatisfied(newPassword)}
            className="text-sm font-medium px-4 py-2 rounded-md bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            {saving ? "変更中..." : "変更する"}
          </button>
        </DialogFooter>
      </Dialog>

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </>
  );
}
