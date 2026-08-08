"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/dialog";
import type { AdminEventResponse } from "@/lib/types/api/admin/events";
import { toDatetimeLocal } from "@/lib/utils/date";
import { fetchWithCsrf } from "@/lib/client/fetchWithCsrf";
import { useAutoNavigate } from "@/components/layout/AutoNavTransition";

interface Props {
  /** 編集時は既存イベントを渡す。新規作成時は undefined */
  event?: AdminEventResponse;
  /** キャンセル時の遷移先。省略時は /admin/events */
  cancelPath?: string;
  /** 指定時、キャンセル操作はページ遷移せずこのコールバックを呼ぶ（未保存の変更がある場合は確認ダイアログを挟む） */
  onCancel?: () => void;
  /** 指定時、保存成功時はページ遷移せずこのコールバックを呼ぶ */
  onSuccess?: () => void;
}

/**
 * イベント作成・編集フォーム。
 * event が渡された場合は PUT、なければ POST を使用する。
 */
export function EventForm({ event, cancelPath = "/admin/events", onCancel, onSuccess }: Props) {
  const router = useRouter();
  const navigate = useAutoNavigate();
  const isEdit = !!event;
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(event?.title ?? "");
  const [startAt, setStartAt] = useState(event ? toDatetimeLocal(event.startAt) : "");
  const [endAt, setEndAt] = useState(event ? toDatetimeLocal(event.endAt) : "");
  const [closedAt, setClosedAt] = useState(
    event?.closedAt ? toDatetimeLocal(event.closedAt) : ""
  );
  const [venue, setVenue] = useState(event?.venue ?? "");
  const [mapEmbedUrl, setMapEmbedUrl] = useState(event?.mapEmbedUrl ?? "");
  const [venueFee, setVenueFee] = useState<number>(event?.venueFee ?? 0);
  const [participationFee, setParticipationFee] = useState<number>(event?.participationFee ?? 0);
  const [vocalEntryLimit, setVocalEntryLimit] = useState<number | "">(event?.vocalEntryLimit ?? "");
  const [instrumentEntryLimit, setInstrumentEntryLimit] = useState<number | "">(event?.instrumentEntryLimit ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  // マウント時点の初期値。キャンセル時の未保存変更判定（isDirty）の比較基準にする。
  const initialValues = useRef({
    title: event?.title ?? "",
    startAt: event ? toDatetimeLocal(event.startAt) : "",
    endAt: event ? toDatetimeLocal(event.endAt) : "",
    closedAt: event?.closedAt ? toDatetimeLocal(event.closedAt) : "",
    venue: event?.venue ?? "",
    mapEmbedUrl: event?.mapEmbedUrl ?? "",
    venueFee: event?.venueFee ?? 0,
    participationFee: event?.participationFee ?? 0,
    vocalEntryLimit: event?.vocalEntryLimit ?? "",
    instrumentEntryLimit: event?.instrumentEntryLimit ?? "",
    description: event?.description ?? "",
  }).current;

  const isDirty =
    title !== initialValues.title ||
    startAt !== initialValues.startAt ||
    endAt !== initialValues.endAt ||
    closedAt !== initialValues.closedAt ||
    venue !== initialValues.venue ||
    mapEmbedUrl !== initialValues.mapEmbedUrl ||
    venueFee !== initialValues.venueFee ||
    participationFee !== initialValues.participationFee ||
    vocalEntryLimit !== initialValues.vocalEntryLimit ||
    instrumentEntryLimit !== initialValues.instrumentEntryLimit ||
    description !== initialValues.description;

  /**
   * 指定フィールドに対応するバリデーションエラーメッセージを返す。
   * 該当するエラーがなければ undefined を返す。
   */
  function fieldError(field: string) {
    return errors.find((e) => e.field === field)?.message;
  }

  /**
   * キャンセルボタン押下時の処理。onCancel が渡されている場合（インライン利用時）は
   * 未保存の変更があれば破棄確認ダイアログを挟み、なければ即座に onCancel を呼ぶ。
   * onCancel が渡されていない場合は既存通りページ遷移する。
   */
  function handleCancelClick() {
    if (onCancel) {
      if (isDirty) {
        setConfirmDiscardOpen(true);
      } else {
        onCancel();
      }
    } else {
      navigate(cancelPath);
    }
  }

  /**
   * イベント作成・編集フォームの送信ハンドラ。
   * isEdit に応じて PUT/POST を使い分けて送信し、成功時は onSuccess があればそれを呼び、
   * なければ一覧ページへ遷移する。失敗時はレスポンスのエラー内容をフィールドごとに表示する。
   */
  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);

    const body = {
      title,
      startAt: `${startAt}:00+09:00`,
      endAt: `${endAt}:00+09:00`,
      closedAt: closedAt ? `${closedAt}:00+09:00` : null,
      venue,
      mapEmbedUrl: mapEmbedUrl || null,
      venueFee,
      participationFee,
      vocalEntryLimit: vocalEntryLimit === "" ? null : vocalEntryLimit,
      instrumentEntryLimit: instrumentEntryLimit === "" ? null : instrumentEntryLimit,
      description,
    };

    const url = isEdit ? `/api/admin/events/${event!.id}` : "/api/admin/events";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetchWithCsrf(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSubmitting(false);

    if (res.ok) {
      if (onSuccess) {
        onSuccess();
      } else {
        startTransition(() => {
          router.push(cancelPath);
          router.refresh();
        });
      }
    } else {
      const json = await res.json();
      setErrors(json.errors ?? [{ field: "", message: json.message }]);
    }
  }

  const actionButtons = (
    <div className="flex justify-end gap-3">
      <Button type="button" variant="outline" onClick={handleCancelClick}>
        キャンセル
      </Button>
      <Button type="submit" disabled={submitting || isPending}>
        {submitting || isPending ? "保存中..." : isEdit ? "更新する" : "作成する"}
      </Button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {isEdit && actionButtons}
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
        <Label htmlFor="mapEmbedUrl">Googleマップ埋め込み（任意）</Label>
        <textarea
          id="mapEmbedUrl"
          value={mapEmbedUrl}
          onChange={(e) => setMapEmbedUrl(e.target.value)}
          rows={3}
          placeholder={'Googleマップの「共有 → 地図を埋め込む」でコピーした <iframe> タグを貼り付けてください'}
          className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {fieldError("mapEmbedUrl") && (
          <p className="text-destructive text-sm">{fieldError("mapEmbedUrl")}</p>
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

      <div className="space-y-1">
        <Label htmlFor="participationFee">参加費（一人当たり）</Label>
        <Input
          id="participationFee"
          type="number"
          min={0}
          step={1}
          value={participationFee}
          onChange={(e) => setParticipationFee(Number(e.target.value))}
        />
        {fieldError("participationFee") && (
          <p className="text-destructive text-sm">{fieldError("participationFee")}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="vocalEntryLimit">ボーカル系エントリー数上限（任意）</Label>
          <Input
            id="vocalEntryLimit"
            type="number"
            min={1}
            step={1}
            value={vocalEntryLimit}
            placeholder="制限なし"
            onChange={(e) => setVocalEntryLimit(e.target.value === "" ? "" : Number(e.target.value))}
          />
          {fieldError("vocalEntryLimit") && (
            <p className="text-destructive text-sm">{fieldError("vocalEntryLimit")}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="instrumentEntryLimit">楽器系エントリー数上限（任意）</Label>
          <Input
            id="instrumentEntryLimit"
            type="number"
            min={1}
            step={1}
            value={instrumentEntryLimit}
            placeholder="制限なし"
            onChange={(e) => setInstrumentEntryLimit(e.target.value === "" ? "" : Number(e.target.value))}
          />
          {fieldError("instrumentEntryLimit") && (
            <p className="text-destructive text-sm">{fieldError("instrumentEntryLimit")}</p>
          )}
        </div>
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

      {!isEdit && actionButtons}

      {/* 変更破棄確認ダイアログ（onCancel が渡されているインライン利用時のみ意味を持つ） */}
      <Dialog open={confirmDiscardOpen} onClose={() => setConfirmDiscardOpen(false)}>
        <DialogHeader title="変更の破棄確認" onClose={() => setConfirmDiscardOpen(false)} />
        <DialogContent>
          <p className="text-sm">編集中の変更を破棄し、保存前の状態に戻します。よろしいですか？</p>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => setConfirmDiscardOpen(false)}>
            キャンセル
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              setConfirmDiscardOpen(false);
              onCancel?.();
            }}
          >
            破棄する
          </Button>
        </DialogFooter>
      </Dialog>
    </form>
  );
}
