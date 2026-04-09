import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { events } from "./events";
import { songs } from "./songs";
import { partEnum } from "./enums";

/**
 * イベントに登録された曲と、その曲で募集するパートを管理する。
 * 同じ曲でもイベントごとに異なるパート構成を定義できる。
 */
export const eventSongs = pgTable("event_songs", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  songId: uuid("song_id")
    .notNull()
    .references(() => songs.id),
  parts: partEnum("parts").array().notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
});
