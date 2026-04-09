"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminEventResponse } from "@/lib/types/api/admin/events";

interface Props {
  /** 編集時は既存イベントを渡す。新規作成時は undefined */
  event?: AdminEventResponse;
}

/**
 * ISO 8601 文字列を datetime-local input 用の文字列（YYYY-MM-DDTHH:mm）に変換する。
 * UTC をブラウザのローカルタイムに変換してから切り出す。
 */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

/**
 * イベント作成・編集フォーム。
 * event が渡された場合は PUT、なければ POST を使用する。
 */
export function EventForm({ event }: Props) {
  const router = useRouter();
  const isEdit = !!event;
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(event?.title ?? "");
  const [startAt, setStartAt] = useState(event ? toDatetimeLocal(event.startAt) : "");
  const [endAt, setEndAt] = useState(event ? toDatetimeLocal(event.endAt) : "");
  const [closedAt, setClosedAt] = useState(
    event?.closedAt ? toDatetimeLocal(event.closedAt) : ""
  );
  const [venue, setVenue] = useState(event?.venue ?? "");
  const [venueFee, setVenueFee] = useState<number>(event?.venueFee ?? 0);
  const [description, setDescription] = useState(event?.description ?? "");
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function fieldError(field: string) {
    return errors.find((e) => e.field === field)?.message;
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);

    const body = {
      title,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      closedAt: closedAt ? new Date(closedAt).toISOString() : null,
      venue,
      venueFee,
      description,
    };

    const url = isEdit ? `/api/admin/events/${event!.id}` : "/api/admin/events";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSubmitting(false);

    if (res.ok) {
      startTransition(() => {
        router.push("/admin/events");
        router.refresh();
      });
    } else {
      const json = await res.json();
      setErrors(json.errors ?? [{ field: "", message: json.message }]);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div className="space-y-1">
        <Label htmlFor="title">タイトル</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        {fieldError("title") && (
          <p className="text-destructive text-sm">{fieldError("title")}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="venue">会場</Label>
        <Input
          id="venue"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          required
        />
        {fieldError("venue") && (
          <p className="text-destructive text-sm">{fieldError("venue")}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="venueFee">会場費</Label>
        <Input
          id="venueFee"
          type="number"
          min={0}
          step={1}
          value={venueFee}
          onChange={(e) => setVenueFee(Number(e.target.value))}
        />
        {fieldError("venueFee") && (
          <p className="text-destructive text-sm">{fieldError("venueFee")}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="startAt">開始日時</Label>
          <Input
            id="startAt"
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            required
          />
          {fieldError("startAt") && (
            <p className="text-destructive text-sm">{fieldError("startAt")}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="endAt">終了日時</Label>
          <Input
            id="endAt"
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            required
          />
          {fieldError("endAt") && (
            <p className="text-destructive text-sm">{fieldError("endAt")}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="closedAt">受付締切日時（任意）</Label>
        <Input
          id="closedAt"
          type="datetime-local"
          value={closedAt}
          onChange={(e) => setClosedAt(e.target.value)}
        />
        {fieldError("closedAt") && (
          <p className="text-destructive text-sm">{fieldError("closedAt")}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">説明</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          required
          className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {fieldError("description") && (
          <p className="text-destructive text-sm">{fieldError("description")}</p>
        )}
      </div>

      {fieldError("") && (
        <p className="text-destructive text-sm">{fieldError("")}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting || isPending}>
          {submitting || isPending ? "保存中..." : isEdit ? "更新する" : "作成する"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => startTransition(() => router.push("/admin/events"))}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
