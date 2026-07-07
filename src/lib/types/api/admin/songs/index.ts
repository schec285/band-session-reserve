import { z } from "zod";
import { partEnum } from "@drizzle/schema/enums";

/**
 * パートの列挙値。
 */
const PartSchema = z.enum(partEnum.enumValues);

/**
 * bulk追加における曲1件分のスキーマ。
 */
const AddEventSongItemSchema = z.object({
  songId: z.string().min(1, "曲は必須です"),
  parts: z.array(PartSchema).min(1, "パートを1つ以上選択してください"),
});

/**
 * POST /api/admin/events/[eventId]/songs のリクエストボディスキーマ。
 * 複数の既存曲をまとめてイベントに追加し、曲ごとに募集するパートを指定する。
 * 同一イベントに同じ曲を複数回登録することも許容する。
 * エラーレスポンスは ErrorResponse 型（src/lib/types/api/index.ts）を使用する。
 */
export const AddEventSongsSchema = z.object({
  songs: z.array(AddEventSongItemSchema).min(1, "曲を1つ以上選択してください"),
});

export type AddEventSongsInput = z.infer<typeof AddEventSongsSchema>;

/**
 * 曲マスタ追加における曲1件分のスキーマ。
 */
const CreateSongItemSchema = z.object({
  title: z.string().min(1, "曲名は必須です"),
  artist: z.string().min(1, "アーティスト名は必須です"),
});

/**
 * POST /api/admin/songs のリクエストボディスキーマ。
 * 新しい曲を複数件まとめてマスタに追加する。
 * エラーレスポンスは ErrorResponse 型（src/lib/types/api/index.ts）を使用する。
 */
export const CreateSongsSchema = z.object({
  songs: z.array(CreateSongItemSchema).min(1, "曲を1件以上入力してください"),
});

export type CreateSongsInput = z.infer<typeof CreateSongsSchema>;

/**
 * 曲マスタのレスポンススキーマ。
 */
export const AdminSongResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
});

export type AdminSongResponse = z.infer<typeof AdminSongResponseSchema>;

/**
 * イベント曲のレスポンススキーマ。
 */
export const AdminEventSongResponseSchema = z.object({
  eventSongId: z.string(),
  songId: z.string(),
  title: z.string(),
  artist: z.string(),
  parts: z.array(PartSchema),
});

export type AdminEventSongResponse = z.infer<typeof AdminEventSongResponseSchema>;

/**
 * PATCH /api/admin/event-songs/[eventSongId] のリクエストボディスキーマ。
 * 募集パートを更新する。
 */
export const UpdateEventSongPartsSchema = z.object({
  parts: z.array(PartSchema).min(1, "パートを1つ以上選択してください"),
});

export type UpdateEventSongPartsInput = z.infer<typeof UpdateEventSongPartsSchema>;

/**
 * DELETE /api/admin/events/[eventId]/songs のリクエストボディスキーマ。
 * 指定した eventSongId を一括削除する。
 */
export const DeleteEventSongsSchema = z.object({
  eventSongIds: z.array(z.string().min(1)).min(1, "削除対象を1件以上選択してください"),
});

export type DeleteEventSongsInput = z.infer<typeof DeleteEventSongsSchema>;
