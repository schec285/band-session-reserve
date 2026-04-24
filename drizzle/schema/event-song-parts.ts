import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { eventSongs } from "./event-songs";
import { partEnum } from "./enums";

/**
 * イベント曲ごとの募集パートを管理する。
 * (event_song_id, part) の複合主キーにより、パート削除時に
 * FK cascade で対応する reservations を自動削除できる。
 */
export const eventSongParts = pgTable("event_song_parts", {
  eventSongId: uuid("event_song_id")
    .notNull()
    .references(() => eventSongs.id, { onDelete: "cascade" }),
  part: partEnum("part").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.eventSongId, table.part] }),
}));
