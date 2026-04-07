"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Event } from "@/lib/types/api/events";
import { EventCard } from "./EventCard";

/**
 * 開催終了イベントをアコーディオンで表示するコンポーネント。
 * デフォルトは閉じた状態。
 */
export function PastEventsAccordion({ events }: { events: Event[] }) {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-lg font-semibold text-muted-foreground mb-4 hover:text-foreground transition-colors"
      >
        開催終了
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-3">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだイベントはありません</p>
          ) : (
            events.map((event) => <EventCard key={event.id} event={event} />)
          )}
        </div>
      )}
    </section>
  );
}
