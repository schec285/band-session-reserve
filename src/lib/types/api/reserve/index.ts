import { z } from "zod";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * エントリー1件分のスキーマ。
 * eventSongId（UUID）とパートを持つ。
 */
export const ReserveEntrySchema = z.object({
  eventSongId: z.string().regex(UUID_REGEX, "イベント曲IDが不正です"),
  part: z.string().min(1, "パートを選択してください"),
});

export type ReserveEntry = z.infer<typeof ReserveEntrySchema>;

/**
 * POST /api/reserve のリクエストボディスキーマ。
 * 複数曲を一括予約する。snsConsent・comment は全エントリー共通。
 */
export const CreateReservationsSchema = z.object({
  entries: z.array(ReserveEntrySchema).min(1, "エントリーは1件以上必要です"),
  snsConsent: z.boolean({ required_error: "選択してください" }),
  comment: z.string().optional(),
});

export type CreateReservationsInput = z.infer<typeof CreateReservationsSchema>;
