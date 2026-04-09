import { z } from "zod";

/**
 * イベント 1 件のスキーマ。
 * 日時フィールドは ISO 8601 文字列で返す。
 */
export const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  closedAt: z.string().nullable(),
  venue: z.string(),
  description: z.string(),
});

export type Event = z.infer<typeof EventSchema>;

/**
 * GET /api/events のレスポンススキーマ。
 */
export const GetEventsResponseSchema = z.object({
  events: z.array(EventSchema),
});

export type GetEventsResponse = z.infer<typeof GetEventsResponseSchema>;

/**
 * パート別予約状況 1 件のスキーマ。
 * username が null の場合は空き、文字列の場合は予約済みを表す。
 * isOwner が true の場合はログイン中のユーザー自身の予約を表す。
 */
export const ReservationInfoSchema = z.object({
  part: z.string(),
  username: z.string().nullable(),
  isOwner: z.boolean(),
  reservationId: z.string().nullable(),
});

export type ReservationInfo = z.infer<typeof ReservationInfoSchema>;

/**
 * 予約状況付き曲 1 件のスキーマ。
 * eventSongId は予約作成時に使用する。
 */
export const SongWithReservationsSchema = z.object({
  id: z.string(),
  eventSongId: z.string(),
  title: z.string(),
  artist: z.string(),
  reservations: z.array(ReservationInfoSchema),
});

export type SongWithReservations = z.infer<typeof SongWithReservationsSchema>;

/**
 * GET /api/events/:eventId/songs のレスポンススキーマ。
 */
export const GetEventSongsResponseSchema = z.object({
  songs: z.array(SongWithReservationsSchema),
});

export type GetEventSongsResponse = z.infer<typeof GetEventSongsResponseSchema>;
