import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { eventSongs } from "./event-songs";
import { partEnum } from "./enums";

/**
 * バンドセッションの予約を管理する。
 * 1レコードが1ユーザー・1イベント曲・1パートの予約を表す。
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
});
