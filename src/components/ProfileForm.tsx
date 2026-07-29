"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { PART_ORDER, PART_LABELS } from "@/lib/utils/parts";
import type { GetProfileResponse } from "@/lib/types/api/user";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PasswordChangeForm } from "@/components/PasswordChangeForm";
import { fetchWithCsrf } from "@/lib/client/fetchWithCsrf";

const COMMENT_TEMPLATE = "・好きなアーティスト\n\n・演奏歴など";

type Props = {
  profile: GetProfileResponse;
};

/**
 * プロフィール編集フォーム。
 * 名前・パート・自由コメントを編集し、PUT /api/user/profile に送信する。
 */
export function ProfileForm({ profile }: Props) {
  const { update } = useSession();
  const [name, setName] = useState(profile.name);
  const [part, setPart] = useState(profile.part ?? "");
  const [comment, setComment] = useState(profile.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [templateConfirmOpen, setTemplateConfirmOpen] = useState(false);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetchWithCsrf("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          part: part || null,
          comment: comment || null,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        await update();
        setMessage({ type: "success", text: json.message });
      } else {
        setMessage({ type: "error", text: json.message ?? "更新に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-0 divide-y divide-border">
      {/* メールアドレス */}
      <div className="py-5">
        <p className="text-xs text-muted-foreground mb-1">メールアドレス</p>
        <p className="text-sm">{profile.email}</p>
      </div>

      {/* パスワード */}
      <PasswordChangeForm />

      {/* 名前 */}
      <div className="py-5 space-y-1">
        <Label htmlFor="profile-name">名前</Label>
        <Input
          id="profile-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：山田 太郎"
        />
      </div>

      {/* パート */}
      <div className="py-5 space-y-1">
        <Label htmlFor="profile-part">パート</Label>
        <select
          id="profile-part"
          value={part}
          onChange={(e) => setPart(e.target.value)}
          className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
        >
          <option value="">選択してください</option>
          {PART_ORDER.map((p) => (
            <option key={p} value={p}>
              {PART_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      {/* 自由コメント */}
      <div className="py-5 space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="profile-comment">自由コメント</Label>
          <button
            type="button"
            onClick={() => {
              if (comment.length > 0) {
                setTemplateConfirmOpen(true);
              } else {
                setComment(COMMENT_TEMPLATE);
              }
            }}
            className="text-xs text-foreground border border-border rounded px-2 py-1 hover:bg-accent transition-colors"
          >
            テンプレートを使用する
          </button>
        </div>
        <textarea
          id="profile-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={"・好きなアーティスト\n\n・演奏歴など"}
          rows={6}
          className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-y"
        />
      </div>

      {/* 保存 */}
      <div className="pt-5">
        {message && (
          <p className={`text-sm mb-3 ${message.type === "success" ? "text-green-600" : "text-destructive"}`}>
            {message.text}
          </p>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="text-sm font-medium px-5 py-2 rounded-md bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </div>
      <Dialog open={templateConfirmOpen} onClose={() => setTemplateConfirmOpen(false)}>
        <DialogHeader title="テンプレートを使用する" onClose={() => setTemplateConfirmOpen(false)} />
        <DialogContent>
          <p className="text-sm">入力済みの内容がクリアされます。テンプレートを使用しますか？</p>
        </DialogContent>
        <DialogFooter>
          <button
            type="button"
            onClick={() => setTemplateConfirmOpen(false)}
            className="text-sm px-4 py-2 rounded-md border border-border hover:bg-accent transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => {
              setComment(COMMENT_TEMPLATE);
              setTemplateConfirmOpen(false);
            }}
            className="text-sm font-medium px-4 py-2 rounded-md bg-foreground text-background hover:opacity-80 transition-opacity"
          >
            使用する
          </button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
