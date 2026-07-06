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
 * 同一リクエスト内で songId が重複している場合はエラーとする。
 * エラーレスポンスは ErrorResponse 型（src/lib/types/api/index.ts）を使用する。
 */
export const AddEventSongsSchema = z.object({
  songs: z
    .array(AddEventSongItemSchema)
    .min(1, "曲を1つ以上選択してください")
    .superRefine((songs, ctx) => {
      const seen = new Set<string>();
      for (const song of songs) {
        if (seen.has(song.songId)) {
          ctx.addIssue({ code: "custom", message: "同じ曲が重複して指定されています" });
          break;
        }
        seen.add(song.songId);
      }
    }),
});

export type AddEventSongsInput = z.infer<typeof AddEventSongsSchema>;

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
