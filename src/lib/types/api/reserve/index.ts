import { z } from "zod";
import { PartSchema, PART_LABELS, FORBIDDEN_SAME_SONG_PAIRS } from "@/lib/utils/parts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * エントリー1件分のスキーマ。
 * eventSongId（UUID）とパートを持つ。
 */
export const ReserveEntrySchema = z.object({
  eventSongId: z.string().regex(UUID_REGEX, "イベント曲IDが不正です"),
  part: PartSchema,
});

export type ReserveEntry = z.infer<typeof ReserveEntrySchema>;

/**
 * POST /api/reserve のリクエストボディスキーマ。
 * 複数曲を一括予約する。snsConsent・comment は全エントリー共通。
 * 同一曲内でFORBIDDEN_SAME_SONG_PAIRSに定義された禁止組み合わせはエラーとする。
 */
export const CreateReservationsSchema = z.object({
  entries: z
    .array(ReserveEntrySchema)
    .min(1, "エントリーは1件以上必要です")
    .superRefine((entries, ctx) => {
      const byEventSong = new Map<string, string[]>();
      for (const entry of entries) {
        const parts = byEventSong.get(entry.eventSongId) ?? [];
        parts.push(entry.part);
        byEventSong.set(entry.eventSongId, parts);
      }

      for (const parts of byEventSong.values()) {
        for (const [a, b] of FORBIDDEN_SAME_SONG_PAIRS) {
          if (parts.includes(a) && parts.includes(b)) {
            ctx.addIssue({
              code: "custom",
              message: `${PART_LABELS[a]}と${PART_LABELS[b]}は同じ曲で同時に選択できません`,
            });
          }
        }
      }
    }),
  snsConsent: z.boolean({ error: "選択してください" }),
  comment: z.string().optional(),
});

export type CreateReservationsInput = z.infer<typeof CreateReservationsSchema>;

/**
 * PATCH /api/reserve/[reservationId] のリクエストボディスキーマ。
 * 変更後のパートを指定する。
 */
export const UpdateReservationPartSchema = z.object({
  part: z.string({ error: "パートを選択してください" }).min(1, "パートを選択してください"),
});

export type UpdateReservationPartInput = z.infer<typeof UpdateReservationPartSchema>;

/**
 * DELETE /api/reserve/[reservationId] の成功レスポンス型。
 */
export type CancelReservationResponse = { message: string };
