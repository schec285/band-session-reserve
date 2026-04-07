import { z } from "zod";
import { partEnum } from "@drizzle/schema/enums";

/**
 * パートの列挙値。
 */
const PartSchema = z.enum(partEnum.enumValues);

/**
 * POST /api/admin/events/[eventId]/songs のリクエストボディスキーマ。
 * 既存の曲をイベントに追加し、募集するパートを指定する。
 * エラーレスポンスは ErrorResponse 型（src/lib/types/api/index.ts）を使用する。
 */
export const AddEventSongSchema = z.object({
  songId: z.string().min(1, "曲は必須です"),
  parts: z.array(PartSchema).min(1, "パートを1つ以上選択してください"),
});

export type AddEventSongInput = z.infer<typeof AddEventSongSchema>;

/**
 * POST /api/admin/songs のリクエストボディスキーマ。
 * 新しい曲をマスタに追加する。
 * エラーレスポンスは ErrorResponse 型（src/lib/types/api/index.ts）を使用する。
 */
export const CreateSongSchema = z.object({
  title: z.string().min(1, "曲名は必須です"),
  artist: z.string().min(1, "アーティスト名は必須です"),
});

export type CreateSongInput = z.infer<typeof CreateSongSchema>;

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
