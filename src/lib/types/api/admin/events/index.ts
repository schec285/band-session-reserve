import { z } from "zod";
import { extractGoogleMapsEmbedUrl } from "@/lib/utils/googleMapsEmbed";

/**
 * イベントフォームの共通フィールド定義。
 * CreateEventSchema / UpdateEventSchema で共有する。
 */
const EventFields = {
  title: z.string().min(1, "タイトルは必須です"),
  startAt: z.string().min(1, "開始日時は必須です"),
  endAt: z.string().min(1, "終了日時は必須です"),
  closedAt: z.string().nullable().optional(),
  venue: z.string().min(1, "会場は必須です"),
  /**
   * Google マップの埋め込みHTML（<iframe> タグ）または URL を受け取り、
   * 検証済みの src URL のみを保存する。管理者が入力した属性やスクリプトは破棄する。
   */
  mapEmbedUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val, ctx) => {
      if (!val) return null;
      const url = extractGoogleMapsEmbedUrl(val);
      if (!url) {
        ctx.addIssue({
          code: "custom",
          message: "Googleマップの埋め込みHTML（またはURL）が正しくありません",
        });
        return z.NEVER;
      }
      return url;
    }),
  venueFee: z.number().int().min(0, "会場費は0以上の整数で入力してください").optional(),
  participationFee: z.number().int().min(0, "参加費は0以上の整数で入力してください").optional(),
  description: z.string().min(1, "説明は必須です"),
  vocalEntryLimit: z.number().int().min(1, "ボーカル系エントリー数は1以上の整数で入力してください").nullable().optional(),
  instrumentEntryLimit: z.number().int().min(1, "楽器系エントリー数は1以上の整数で入力してください").nullable().optional(),
};

type EventFieldsInput = {
  startAt: string;
  endAt: string;
  closedAt?: string | null;
};

/**
 * 日時バリデーションを追加するラッパー。
 * - startAt > 現在日時
 * - startAt < endAt
 * - closedAt <= startAt（closedAt が未設定の場合はスキップ）
 */
const withEventDateValidations = <T extends z.ZodType<EventFieldsInput>>(schema: T) =>
  schema
    .refine((data) => new Date(data.startAt) > new Date(), {
      message: "開始日時は現在日時より後に設定してください",
      path: ["startAt"],
    })
    .refine((data) => new Date(data.startAt) < new Date(data.endAt), {
      message: "終了日時は開始日時より後に設定してください",
      path: ["endAt"],
    })
    .refine(
      (data) => !data.closedAt || new Date(data.closedAt) <= new Date(data.startAt),
      {
        message: "受付締切日時は開始日時以前に設定してください",
        path: ["closedAt"],
      }
    );

/**
 * POST /api/admin/events のリクエストボディスキーマ。
 * エラーレスポンスは ErrorResponse 型（src/lib/types/api/index.ts）を使用する。
 */
export const CreateEventSchema = withEventDateValidations(z.object(EventFields));

export type CreateEventInput = z.infer<typeof CreateEventSchema>;

/**
 * PUT /api/admin/events/[eventId] のリクエストボディスキーマ。
 * 全フィールド必須。エラーレスポンスは ErrorResponse 型（src/lib/types/api/index.ts）を使用する。
 */
export const UpdateEventSchema = withEventDateValidations(z.object(EventFields));

export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;

/**
 * イベント作成・更新のレスポンススキーマ。
 */
export const AdminEventResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  closedAt: z.string().nullable(),
  venue: z.string(),
  mapEmbedUrl: z.string().nullable(),
  venueFee: z.number(),
  participationFee: z.number(),
  description: z.string(),
  vocalEntryLimit: z.number().nullable(),
  instrumentEntryLimit: z.number().nullable(),
});

export type AdminEventResponse = z.infer<typeof AdminEventResponseSchema>;

/**
 * PATCH /api/admin/events/[eventId]/collections のリクエストボディスキーマ。
 */
export const SetCollectionSchema = z.object({
  userId: z.string().uuid("userId は UUID 形式で指定してください"),
  collected: z.boolean(),
});

export type SetCollectionInput = z.infer<typeof SetCollectionSchema>;
