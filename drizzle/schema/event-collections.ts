import { pgTable, uuid, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { events } from "./events";
import { users } from "./users";

/**
 * イベントごとの参加費徴収状況を管理する。
 * (event_id, user_id) の複合主キーとし、行の存在 = 徴収済みを表す。
 * イベントまたはユーザー削除時はカスケード削除する。
 */
export const eventCollections = pgTable("event_collections", {
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  collectedAt: timestamp("collected_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.eventId, table.userId] }),
}));
