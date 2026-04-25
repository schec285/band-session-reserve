import { PART_LABELS, PART_ORDER } from "@/lib/utils/parts";
import type { Part } from "@drizzle/schema";

/**
 * パートバッジの一覧を PART_ORDER 順に並べて表示する。
 * entered が true のパートは緑バッジ、false はミュートバッジで表示する。
 */
export function PartBadgeList({ parts }: { parts: { part: Part; entered: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {[...parts]
        .sort((a, b) => PART_ORDER.indexOf(a.part) - PART_ORDER.indexOf(b.part))
        .map(({ part, entered }) => (
          <span
            key={part}
            className={
              entered
                ? "px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 border border-green-300"
                : "px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground border border-border"
            }
          >
            {PART_LABELS[part] ?? part}
          </span>
        ))}
    </div>
  );
}
