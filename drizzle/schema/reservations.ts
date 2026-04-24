import { pgTable, uuid, text, boolean, timestamp, foreignKey } from "drizzle-orm/pg-core";
import { users } from "./users";
import { eventSongs } from "./event-songs";
import { eventSongParts } from "./event-song-parts";
import { partEnum } from "./enums";

/**
 * バンドセッションの予約を管理する。
 * 1レコードが1ユーザー・1イベント曲・1パートの予約を表す。
 * (event_song_id, part) → event_song_parts の FK cascade により、
 * 募集パート削除時にその予約が自動削除される。
 */
export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  eventSongId: uuid("event_song_id")
    .notNull()
    .references(() => eventSongs.id, { onDelete: "cascade" }),
  part: partEnum("part").notNull(),
  snsConsent: boolean("sns_consent").notNull().default(false),
  isTransferable: boolean("is_transferable").notNull().default(false),
  comment: text("comment"),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  eventSongPartFk: foreignKey({
    columns: [table.eventSongId, table.part],
    foreignColumns: [eventSongParts.eventSongId, eventSongParts.part],
    name: "reservations_event_song_part_fk",
  }).onDelete("cascade"),
}));
