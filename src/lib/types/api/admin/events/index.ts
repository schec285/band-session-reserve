import { z } from "zod";

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
  description: z.string().min(1, "説明は必須です"),
};

type EventFieldsInput = {
  startAt: string;
  endAt: string;
  closedAt?: string | null;
};

/**
 * 日時バリデーションを追加するラッパー。
 * - startAt < endAt
 * - closedAt <= startAt（closedAt が未設定の場合はスキップ）
 */
const withEventDateValidations = <T extends z.ZodType<EventFieldsInput>>(schema: T) =>
  schema
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
  description: z.string(),
});

export type AdminEventResponse = z.infer<typeof AdminEventResponseSchema>;
