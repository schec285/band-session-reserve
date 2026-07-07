"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventStatusBadge, getEventStatus } from "@/components/EventStatusBadge";
import { formatDatetime } from "@/lib/utils/date";
import type { AdminEventResponse } from "@/lib/types/api/admin/events";
import { EventForm } from "./EventForm";

interface Props {
  event: AdminEventResponse;
  entrantsCount: number;
}

/**
 * イベント詳細画面の「イベント情報」セクション。
 * 通常時は情報を表示し、右上の編集アイコンでその場を EventForm によるインライン編集表示に切り替える。
 */
export function AdminEventInfoSection({ event, entrantsCount }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  const totalCollected = event.participationFee * entrantsCount;
  const balance = totalCollected - event.venueFee;
  const status = getEventStatus(event);

  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">イベント情報</h2>
        {!isEditing && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="イベント情報を編集"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </div>

      {isEditing ? (
        <EventForm
          event={event}
          onCancel={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false);
            router.refresh();
          }}
        />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold">{event.title}</h3>
            <EventStatusBadge status={status} />
          </div>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-muted-foreground">会場</dt>
              <dd className="font-medium mt-0.5">{event.venue}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">開始日時</dt>
              <dd className="font-medium mt-0.5">{formatDatetime(event.startAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">終了日時</dt>
              <dd className="font-medium mt-0.5">{formatDatetime(event.endAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">受付締切日時</dt>
              <dd className="font-medium mt-0.5">
                {event.closedAt ? formatDatetime(event.closedAt) : "未設定"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">会場費</dt>
              <dd className="font-medium mt-0.5">{event.venueFee.toLocaleString()} 円</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">参加費</dt>
              <dd className="font-medium mt-0.5">{event.participationFee.toLocaleString()} 円</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">ボーカル系エントリー上限</dt>
              <dd className="font-medium mt-0.5">
                {event.vocalEntryLimit != null ? `${event.vocalEntryLimit} 枠` : "無制限"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">楽器系エントリー上限</dt>
              <dd className="font-medium mt-0.5">
                {event.instrumentEntryLimit != null ? `${event.instrumentEntryLimit} 枠` : "無制限"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">暫定徴収額</dt>
              <dd className="font-medium mt-0.5 flex items-baseline gap-2">
                <span>{totalCollected.toLocaleString("ja-JP")} 円</span>
                <span className={`text-sm ${balance > 0 ? "text-green-600" : balance < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                  {balance > 0
                    ? `(+${balance.toLocaleString("ja-JP")} 円)`
                    : balance < 0
                      ? `(-${Math.abs(balance).toLocaleString("ja-JP")} 円)`
                      : "(収支ゼロ)"}
                </span>
              </dd>
            </div>
          </dl>

          {event.description && (
            <div>
              <p className="text-muted-foreground text-sm mb-1">説明</p>
              <p className="text-sm whitespace-pre-wrap">{event.description}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
